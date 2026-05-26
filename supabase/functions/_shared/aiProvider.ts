// Shared AI provider helper with hardened error handling.
// - Prefers Lovable AI gateway, falls back to direct Gemini.
// - Returns structured success/failure so callers never deref nulls.
// - Surfaces 402 (credits exhausted) and 429 (rate limited) so callers can pass them upstream.

import { logger } from "./logger.ts";

export interface AiCallOk {
  ok: true;
  content: string;
  provider: "lovable" | "gemini";
}

export interface AiCallFail {
  ok: false;
  status: number; // HTTP-like status: 402, 429, 503, 500
  error: string;
  retryable: boolean;
}

export type AiCallResult = AiCallOk | AiCallFail;

interface CallOptions {
  model?: string;
  fallbackModel?: string;
  timeoutMs?: number;
  responseFormat?: "text" | "json";
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

export async function callAI(
  systemPrompt: string,
  userMessage: string,
  opts: CallOptions = {},
): Promise<AiCallResult> {
  const {
    model = "google/gemini-2.5-flash-lite",
    fallbackModel = "gemini-2.0-flash-lite",
    timeoutMs = 45_000,
  } = opts;

  // @ts-expect-error Deno global
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  // @ts-expect-error Deno global
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

  // --- 1. Lovable AI gateway (primary)
  if (LOVABLE_API_KEY) {
    try {
      const res = await fetchWithTimeout(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
          }),
        },
        timeoutMs,
      );

      if (res.ok) {
        const payload = await res.json().catch(() => null);
        const content = payload?.choices?.[0]?.message?.content;
        if (typeof content === "string" && content.trim().length > 0) {
          return { ok: true, content, provider: "lovable" };
        }
        logger.warn("Lovable AI returned empty content, trying fallback");
      } else if (res.status === 402 || res.status === 429) {
        // Don't try fallback — surface the issue directly.
        const txt = await res.text().catch(() => "");
        logger.warn(`Lovable AI ${res.status}: ${txt.slice(0, 200)}`);
        return {
          ok: false,
          status: res.status,
          error:
            res.status === 402
              ? "AI credits exhausted. Please add credits in Settings > Workspace > Usage."
              : "AI rate limit reached. Please try again shortly.",
          retryable: res.status === 429,
        };
      } else {
        const txt = await res.text().catch(() => "");
        logger.warn(`Lovable AI gateway ${res.status}: ${txt.slice(0, 200)}`);
      }
    } catch (err) {
      logger.warn("Lovable AI gateway threw:", err);
    }
  }

  // --- 2. Direct Gemini (fallback)
  if (GEMINI_API_KEY) {
    try {
      const res = await fetchWithTimeout(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GEMINI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: fallbackModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
          }),
        },
        timeoutMs,
      );

      if (res.ok) {
        const payload = await res.json().catch(() => null);
        const content = payload?.choices?.[0]?.message?.content;
        if (typeof content === "string" && content.trim().length > 0) {
          return { ok: true, content, provider: "gemini" };
        }
      } else {
        const txt = await res.text().catch(() => "");
        logger.error(`Gemini API ${res.status}: ${txt.slice(0, 200)}`);
        if (res.status === 429) {
          return {
            ok: false,
            status: 429,
            error: "AI rate limit reached. Please try again shortly.",
            retryable: true,
          };
        }
      }
    } catch (err) {
      logger.error("Gemini fetch threw:", err);
    }
  }

  return {
    ok: false,
    status: 503,
    error: "AI services are temporarily unavailable. Please try again.",
    retryable: true,
  };
}

/**
 * Best-effort JSON extraction from an LLM response that may include markdown
 * fences, prose around the JSON, or be truncated.
 */
export function safeExtractJSON<T = unknown>(raw: string): T | null {
  if (!raw || typeof raw !== "string") return null;
  let s = raw.trim();

  // Strip markdown fences.
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  // Direct parse first.
  try {
    return JSON.parse(s) as T;
  } catch { /* continue */ }

  // Try to locate the first JSON object or array in the text.
  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  const start =
    firstObj === -1 ? firstArr : firstArr === -1 ? firstObj : Math.min(firstObj, firstArr);
  if (start < 0) return null;

  const opener = s[start];
  const closer = opener === "{" ? "}" : "]";
  const end = s.lastIndexOf(closer);
  if (end <= start) return null;

  const candidate = s.slice(start, end + 1);
  try {
    return JSON.parse(candidate) as T;
  } catch {
    return null;
  }
}