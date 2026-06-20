// Shared helper: check whether an organization has Auto Mode enabled.
// Used by every scheduled / cron-triggered AI function to short-circuit
// when the admin has Auto Mode turned OFF. Manual ("Run now", per-request
// user-triggered) calls bypass this check — gate only when the request
// arrives via cron / service role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export async function isAutoModeEnabled(orgId: string): Promise<boolean> {
  if (!orgId) return false;
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data } = await supabase
      .from("auto_mode_settings")
      .select("enabled")
      .eq("organization_id", orgId)
      .maybeSingle();
    return Boolean(data?.enabled);
  } catch {
    // Fail closed: if we can't read the flag, treat as OFF for cron runs.
    return false;
  }
}

export function autoModeSkippedResponse(corsHeaders: Record<string, string>, orgId: string) {
  return new Response(
    JSON.stringify({ skipped: true, reason: "auto_mode_off", organization_id: orgId }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}