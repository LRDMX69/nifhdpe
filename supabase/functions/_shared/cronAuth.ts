// Shared cron auth helper.
// Accepts either the service role key OR the rotating cron_shared_secret stored in vault.
// Used by cron-invoked functions whose `verify_jwt = false` is set in config.toml.

// Shared secret used by pg_cron jobs to authenticate to internal edge functions.
// Stored in DB vault under name 'cron_shared_secret' and embedded here so the
// edge function can validate without an extra PostgREST round-trip.
// Rotate by regenerating both values together.
const CRON_SHARED_SECRET = "8c53aca960d0620bba1166709891ac2ed8be9ea507d56847e3844a2e7263e507";

/** Returns true if the request bears either the service role key or the cron shared secret. */
export async function isCronOrServiceRequest(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceKey && token === serviceKey) return true;
  if (token === CRON_SHARED_SECRET) return true;
  return false;
}