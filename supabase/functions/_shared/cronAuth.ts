// Shared cron auth helper.
// Accepts either the service role key OR the rotating cron_shared_secret stored in vault.
// Used by cron-invoked functions whose `verify_jwt = false` is set in config.toml.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

let cachedCronSecret: { value: string; expiresAt: number } | null = null;

async function fetchCronSecret(): Promise<string | null> {
  const now = Date.now();
  if (cachedCronSecret && cachedCronSecret.expiresAt > now) return cachedCronSecret.value;
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await admin.rpc("get_cron_shared_secret");
    if (error) {
      console.error("cronAuth: rpc error", error);
      return null;
    }
    if (!data) {
      console.error("cronAuth: rpc returned no data");
      return null;
    }
    cachedCronSecret = { value: String(data), expiresAt: now + 5 * 60_000 };
    return cachedCronSecret.value;
  } catch (e) {
    console.error("cronAuth: exception", e);
    return null;
  }
}

/** Returns true if the request bears either the service role key or the cron shared secret. */
export async function isCronOrServiceRequest(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceKey && token === serviceKey) return true;
  const cron = await fetchCronSecret();
  if (cron && token === cron) return true;
  return false;
}