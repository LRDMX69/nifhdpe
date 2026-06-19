// Shared cron auth helper.
// Accepts either the service role key OR the rotating cron_shared_secret stored in vault.
// Used by cron-invoked functions whose `verify_jwt = false` is set in config.toml.

// Shared secret used by pg_cron jobs to authenticate to internal edge functions.
// Stored in DB vault under name 'cron_shared_secret' and ALSO injected as the
// CRON_SHARED_SECRET edge-function secret. We prefer the env var so rotation
// is a single secret update, with a hardcoded fallback only to keep already
// scheduled cron jobs working during the rotation window.
const CRON_SHARED_SECRET_FALLBACK = "8c53aca960d0620bba1166709891ac2ed8be9ea507d56847e3844a2e7263e507";
function cronSecret(): string {
  return Deno.env.get("CRON_SHARED_SECRET") || CRON_SHARED_SECRET_FALLBACK;
}

/** Returns true if the request bears either the service role key or the cron shared secret. */
export async function isCronOrServiceRequest(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceKey && token === serviceKey) return true;
  if (token === cronSecret()) return true;
  return false;
}