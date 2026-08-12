// Shared cron auth helper.
// Accepts either the service role key OR the rotating cron shared secret.
// Used by cron-invoked functions whose `verify_jwt = false` is set in config.toml,
// so the platform gateway does not reject the non-JWT credential and this helper
// is the actual authorization boundary.

// The cron secret MUST come from the CRON_SHARED_SECRET edge-function secret.
// There is deliberately NO hardcoded fallback: if the variable is missing the
// check fails closed so background automation cannot be invoked with a
// credential that is readable in source control.
function cronSecret(): string {
  return Deno.env.get("CRON_SHARED_SECRET") ?? "";
}

/**
 * Returns true if the request bears either:
 *  - the service role key as a Bearer token (Authorization header), or
 *  - the cron shared secret, in the Authorization header OR the `x-cron-secret`
 *    custom header (the latter is what the pg_cron jobs in
 *    20260812000005_fix_cron_jobs.sql send).
 */
export async function isCronOrServiceRequest(req: Request): Promise<boolean> {
  const expected = cronSecret();
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const customHeader = (req.headers.get("x-cron-secret") ?? "").trim();

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceKey && bearer && bearer === serviceKey) return true;

  if (!expected) return false;
  if (expected && bearer && bearer === expected) return true;
  if (expected && customHeader && customHeader === expected) return true;
  return false;
}
