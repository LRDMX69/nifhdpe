import { logger } from "./logger.ts";

export async function captureException(err: unknown, context?: Record<string, unknown>) {
  try {
    logger.error("captureException", err, context ?? {});

    // Prefer an explicit ingest URL for Sentry (recommended as SENTRY_INGEST_URL).
    // If only SENTRY_DSN is present, try to use it if it's an ingest URL.
    const ingestUrl = Deno.env.get("SENTRY_INGEST_URL") || Deno.env.get("SENTRY_DSN");
    const authToken = Deno.env.get("SENTRY_AUTH_TOKEN");
    if (!ingestUrl) return;

    // Prepare a minimal Sentry-like event payload. This is best-effort and
    // intentionally minimal to avoid blocking the function.
    const event = {
      event_id: (Math.random().toString(16).slice(2, 10)),
      message: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
      platform: "javascript",
      extra: context ?? {},
    };

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
      await fetch(ingestUrl, { method: "POST", headers, body: JSON.stringify(event) });
    } catch (e) {
      logger.warn("captureException: failed to send to Sentry ingest URL", e);
    }
  } catch (_e) {
    // swallow any error here to avoid breaking caller
  }
}

export function handleErrorResponse(err: unknown) {
  // Fire-and-forget capture. Do not await to avoid delaying responses.
  captureException(err).catch(() => undefined);
  return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}
