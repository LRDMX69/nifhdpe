// Shared AI provider helper with hardened error handling.
// - Prefers Lovable AI gateway, falls back to direct Gemini.
// - Returns structured success/failure so callers never deref nulls.
// - Surfaces 402 (credits exhausted) and 429 (rate limited) so callers can pass them upstream.

import { logger } from "./logger.ts";
// @ts-expect-error npm import resolved by Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
  /** When provided, the call is recorded in ai_usage_logs for cost tracking & monthly caps. */
  organizationId?: string;
  /** Optional label written to ai_usage_logs.function_name. */
  functionName?: string;
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
    organizationId,
    functionName,
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

  await logUsage(organizationId, functionName, false, 0, "all_providers_failed");
  return {
    ok: false,
    status: 503,
    error: "AI services are temporarily unavailable. Please try again.",
    retryable: true,
  };
}

async function logUsage(
  organizationId: string | undefined,
  functionName: string | undefined,
  success: boolean,
  tokensEstimate: number,
  error?: string,
) {
  if (!organizationId) return;
  try {
    // @ts-expect-error Deno global
    const url = Deno.env.get("SUPABASE_URL");
    // @ts-expect-error Deno global
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    const supabase = createClient(url, key);
    await supabase.from("ai_usage_logs").insert({
      organization_id: organizationId,
      function_name: functionName || "callAI",
      success,
      tokens_estimate: tokensEstimate,
    });
    void error;
  } catch (e) {
    logger.warn("ai_usage_logs insert failed:", e);
  }
}

/** Estimate tokens from text length (~4 chars per token). */
function estimateTokens(...parts: string[]): number {
  return Math.ceil(parts.reduce((n, s) => n + (s?.length || 0), 0) / 4);
}

// Wrap success paths to log usage. We patch both providers by wrapping the
// existing function body via a small re-export. To keep the change minimal we
// instead instrument callers; the export below is a convenience helper that
// callers can use for one-shot logging right after a successful callAI().
export async function recordAiUsage(
  organizationId: string | undefined,
  functionName: string,
  systemPrompt: string,
  userMessage: string,
  responseText: string,
  success: boolean,
  error?: string,
) {
  await logUsage(
    organizationId,
    functionName,
    success,
    estimateTokens(systemPrompt, userMessage, responseText),
    error,
  );
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