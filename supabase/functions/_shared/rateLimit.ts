// Rate limiting utility for Supabase Edge Functions
// Uses in-memory store with IP-based tracking

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyPrefix?: string; // Optional prefix for rate limit keys
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// Note: In production with multiple function instances, use Redis or similar
const rateLimitStore = new Map<string, RateLimitEntry>();

// Default rate limits
const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
};

/**
 * Get client IP from request
 */
export function getClientIP(req: Request): string {
  // Try to get IP from various headers
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  
  // Fallback to a default (in production, this should be enhanced)
  return "unknown";
}

/**
 * Get rate limit key for a request
 */
function getRateLimitKey(req: Request, identifier?: string): string {
  const ip = getClientIP(req);
  const path = new URL(req.url).pathname;
  
  if (identifier) {
    return `${ip}:${identifier}:${path}`;
  }
  
  return `${ip}:${path}`;
}

/**
 * Clean up expired entries from the rate limit store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime <= now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check if request is rate limited
 * Returns { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(
  req: Request,
  config: Partial<RateLimitConfig> = {},
  identifier?: string
): { allowed: boolean; remaining: number; resetTime: number } {
  const finalConfig = { ...DEFAULT_RATE_LIMIT, ...config };
  const key = getRateLimitKey(req, identifier);
  const now = Date.now();
  
  // Cleanup expired entries periodically (every 100 requests)
  if (Math.random() < 0.01) {
    cleanupExpiredEntries();
  }

  let entry = rateLimitStore.get(key);
  
  // If no entry or entry expired, create new one
  if (!entry || entry.resetTime <= now) {
    entry = {
      count: 0,
      resetTime: now + finalConfig.windowMs,
    };
    rateLimitStore.set(key, entry);
  }
  
  // Check if limit exceeded
  if (entry.count >= finalConfig.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }
  
  // Increment count
  entry.count++;
  
  return {
    allowed: true,
    remaining: finalConfig.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Rate limit middleware for edge functions
 * Returns a Response if rate limited, null if allowed
 */
export function rateLimitMiddleware(
  req: Request,
  config: Partial<RateLimitConfig> = {},
  identifier?: string
): Response | null {
  const result = checkRateLimit(req, config, identifier);
  
  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: "Too many requests, please try again later",
        resetTime: result.resetTime,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": String(config.maxRequests || DEFAULT_RATE_LIMIT.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetTime / 1000)),
          "Retry-After": String(Math.ceil((result.resetTime - Date.now()) / 1000)),
        },
      }
    );
  }
  
  return null;
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: Response,
  remaining: number,
  limit: number,
  resetTime: number
): Response {
  const newHeaders = new Headers(response.headers);
  newHeaders.set("X-RateLimit-Limit", String(limit));
  newHeaders.set("X-RateLimit-Remaining", String(remaining));
  newHeaders.set("X-RateLimit-Reset", String(Math.ceil(resetTime / 1000)));
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// Predefined rate limit configurations for different function types
export const RATE_LIMITS = {
  // Strict limits for AI functions (expensive operations)
  AI_FUNCTION: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
  },
  
  // Moderate limits for data processing
  PROCESSING: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
  },
  
  // Standard limits for general API
  STANDARD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },
  
  // Relaxed limits for read-only operations
  READ_ONLY: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120, // 120 requests per minute
  },
};
