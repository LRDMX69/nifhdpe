/**
 * Translate raw Supabase / Postgres / fetch errors into friendly,
 * one-sentence messages we can show via toast. Falls back to the
 * original message when we don't have a mapping.
 */
export function humanizeError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!err) return fallback;
  const anyErr = err as { code?: string; message?: string; details?: string; hint?: string; status?: number };
  const code = anyErr.code ?? "";
  const raw = (anyErr.message ?? "").toString();

  // Postgres SQLSTATE codes
  switch (code) {
    case "23505": return "That record already exists.";
    case "23503": return "This is linked to other data and can't be removed.";
    case "23502": return "A required field is missing.";
    case "23514": return "One of the values doesn't meet the rules for this form.";
    case "42501": return "You don't have permission to perform this action.";
    case "P0001": return raw || "The database blocked this change.";
    case "PGRST116": return "We couldn't find what you were looking for.";
    case "PGRST301": return "Your session expired. Please sign in again.";
    case "PGRST200": return "Some required data isn't linked yet. Please refresh and try again.";
  }

  // Common substring patterns
  const lower = raw.toLowerCase();
  if (lower.includes("row-level security") || lower.includes("permission denied")) {
    return "You don't have permission to perform this action.";
  }
  if (lower.includes("jwt") || lower.includes("not authenticated") || lower.includes("invalid token")) {
    return "Your session expired. Please sign in again.";
  }
  if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
    return "Network problem. Check your connection and try again.";
  }
  if (lower.includes("duplicate key")) {
    return "That record already exists.";
  }
  if (lower.includes("violates foreign key")) {
    return "This is linked to other data and can't be removed.";
  }

  // HTTP-style statuses
  if (anyErr.status === 401 || anyErr.status === 403) return "You don't have permission to perform this action.";
  if (anyErr.status === 404) return "We couldn't find what you were looking for.";
  if (anyErr.status && anyErr.status >= 500) return "Our servers had a hiccup. Please try again in a moment.";

  return raw || fallback;
}