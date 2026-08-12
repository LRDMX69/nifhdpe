/**
 * Classification of errors raised while replaying offline-queued submissions.
 *
 * Permanent failures must not be retried forever (RLS denial, invalid input,
 * duplicate key, missing referenced record) — retrying them wastes the user's
 * connection and hides the real problem. Transient failures (network, timeout,
 * 5xx) keep retrying on the next reconnect. (Finding H-01.)
 */
export const isPermanentQueueError = (err: unknown): boolean => {
  const e = (err ?? {}) as { code?: string; message?: string };
  const code = (e.code ?? "").toLowerCase();
  const message = `${e.message ?? ""}`.toLowerCase();
  const permanentCodes = ["42501", "23505", "23502", "23503", "22p02", "42601", "23514"];
  return (
    permanentCodes.includes(code) ||
    message.includes("permission denied") ||
    message.includes("row-level security") ||
    message.includes("violates") ||
    message.includes("invalid input") ||
    message.includes("not found")
  );
};
