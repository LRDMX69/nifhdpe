// Rate limiting utility for Supabase Edge Functions
// Supports Upstash Redis (REST) if environment is configured, otherwise falls
// back to an in-memory Map (single-instance).

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyPrefix?: string; // Optional prefix for rate limit keys
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (fallback)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Default rate limits
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
};

// Upstash REST details (optional)
const UPSTASH_BASE = Deno.env.get("UPSTASH_REDIS_REST_URL") || Deno.env.get("UPSTASH_REDIS_REST_BASE");
const UPSTASH_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN") || Deno.env.get("UPSTASH_REDIS_REST_AUTH");

/**
 * Get client IP from request
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP;
  return "unknown";
}

/**
 * Build a rate limit key
 */
function getRateLimitKey(req: Request, identifier?: string): string {
  const ip = getClientIP(req);
  const path = new URL(req.url).pathname;
  return identifier ? `${ip}:${identifier}:${path}` : `${ip}:${path}`;
}

/**
 * Attempt to use Upstash REST API to increment and TTL a key.
 * Returns { count, resetTime } or null if Redis is unavailable.
 */
async function redisIncrWithTTL(key: string, windowMs: number): Promise<{ count: number; resetTime: number } | null> {
  if (!UPSTASH_BASE || !UPSTASH_TOKEN) return null;
  try {
    const encKey = encodeURIComponent(key);
    // INCR
    const incrRes = await fetch(`${UPSTASH_BASE}/incr/${encKey}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    if (!incrRes.ok) return null;
    const incrJson = await incrRes.json();
    const count = Number(incrJson.result ?? incrJson);

    // If first increment, set expire
    if (count === 1) {
      const expireSec = Math.ceil(windowMs / 1000);
      await fetch(`${UPSTASH_BASE}/expire/${encKey}/${expireSec}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      });
    }

    // Query TTL
    const ttlRes = await fetch(`${UPSTASH_BASE}/ttl/${encKey}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    const ttlJson = await ttlRes.json();
    const ttl = Number(ttlJson.result ?? ttlJson);
    const resetTime = Date.now() + (ttl > 0 ? ttl * 1000 : windowMs);
    return { count, resetTime };
  } catch (_e) {
    return null;
  }
}

/**
 * Clean up expired entries from the in-memory rate limit store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) if (entry.resetTime <= now) rateLimitStore.delete(key);
}

/**
 * Check if request is rate limited
 * Returns { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(req: Request, config: Partial<RateLimitConfig> = {}, identifier?: string): { allowed: boolean; remaining: number; resetTime: number } {
  const finalConfig = { ...DEFAULT_RATE_LIMIT, ...config };
  const key = getRateLimitKey(req, identifier);

  // Try Redis synchronously by performing a best-effort async call and falling back
  // NOTE: we cannot await here (sync function), so perform a simple in-memory check.
  // For Upstash-backed consistency, callers should use rateLimitMiddleware which is async.

  const now = Date.now();
  if (Math.random() < 0.01) cleanupExpiredEntries();

  let entry = rateLimitStore.get(key);
  if (!entry || entry.resetTime <= now) {
    entry = { count: 0, resetTime: now + finalConfig.windowMs };
    rateLimitStore.set(key, entry);
  }

  if (entry.count >= finalConfig.maxRequests) return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  entry.count++;
  return { allowed: true, remaining: finalConfig.maxRequests - entry.count, resetTime: entry.resetTime };
}

/**
 * Async rate limit middleware that prefers Redis (Upstash) when available.
 * Returns a Response if rate limited, null if allowed.
 */
export async function rateLimitMiddleware(req: Request, config: Partial<RateLimitConfig> = {}, identifier?: string): Promise<Response | null> {
  const finalConfig = { ...DEFAULT_RATE_LIMIT, ...config };
  const key = getRateLimitKey(req, identifier);

  // Prefer Redis when configured
  if (UPSTASH_BASE && UPSTASH_TOKEN) {
    const redisResult = await redisIncrWithTTL(key, finalConfig.windowMs);
    if (redisResult) {
      const { count, resetTime } = redisResult;
      if (count > finalConfig.maxRequests) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded", message: "Too many requests, please try again later", resetTime }), {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(finalConfig.maxRequests),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(resetTime / 1000)),
            "Retry-After": String(Math.ceil((resetTime - Date.now()) / 1000)),
          },
        });
      }
      return null;
    }
    // If Redis attempted but failed, fall through to in-memory
  }

  // Fallback to in-memory store
  const result = checkRateLimit(req, finalConfig, identifier);
  if (!result.allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded", message: "Too many requests, please try again later", resetTime: result.resetTime }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": String(finalConfig.maxRequests),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetTime / 1000)),
        "Retry-After": String(Math.ceil((result.resetTime - Date.now()) / 1000)),
      },
    });
  }
  return null;
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(response: Response, remaining: number, limit: number, resetTime: number): Response {
  const newHeaders = new Headers(response.headers);
  newHeaders.set("X-RateLimit-Limit", String(limit));
  newHeaders.set("X-RateLimit-Remaining", String(remaining));
  newHeaders.set("X-RateLimit-Reset", String(Math.ceil(resetTime / 1000)));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: newHeaders });
}

// Predefined rate limit configurations for different function types
export const RATE_LIMITS = {
  AI_FUNCTION: { windowMs: 60 * 1000, maxRequests: 10 },
  PROCESSING: { windowMs: 60 * 1000, maxRequests: 30 },
  STANDARD: { windowMs: 60 * 1000, maxRequests: 60 },
  READ_ONLY: { windowMs: 60 * 1000, maxRequests: 120 },
};
