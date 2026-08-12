// Monthly AI spend cap per organization, enforced before any AI call.
// Replaces the cap logic that lived in the deleted ai-orchestrator stub.
// @ts-expect-error npm import resolved by Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const DEFAULT_MONTHLY_TOKEN_CAP = 2_000_000; // ~2M tokens / month / org

export interface SpendCapResult {
  allowed: boolean;
  used: number;
  cap: number;
  reason?: string;
}

/**
 * Returns whether the org is still under its monthly token budget.
 *
 * Failure philosophy is deliberately documented and asymmetric:
 *  - Interactive (user-waiting) calls: FAIL OPEN — a transient DB issue must
 *    not silently disable every AI feature the user is looking at.
 *  - Scheduled (cron / service-role) calls: FAIL CLOSED — nobody is waiting,
 *    and the budget ceiling matters most for unattended automation. Pass
 *    { failOpen: false } for those calls.
 */
export async function checkSpendCap(
  organizationId: string | undefined,
  opts: { failOpen?: boolean } = {},
): Promise<SpendCapResult> {
  const failOpen = opts.failOpen ?? true;
  const cap = Number(
    // @ts-expect-error Deno global
    Deno.env.get("AI_MONTHLY_TOKEN_CAP") ?? DEFAULT_MONTHLY_TOKEN_CAP,
  ) || DEFAULT_MONTHLY_TOKEN_CAP;
  if (!organizationId) return { allowed: true, used: 0, cap };
  try {
    // @ts-expect-error Deno global
    const url = Deno.env.get("SUPABASE_URL");
    // @ts-expect-error Deno global
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      return failOpen
        ? { allowed: true, used: 0, cap }
        : { allowed: false, used: 0, cap, reason: "spend_cap_unavailable" };
    }
    const supabase = createClient(url, key);
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("ai_usage_logs")
      .select("tokens_estimate")
      .eq("organization_id", organizationId)
      .gte("created_at", monthStart.toISOString());
    const used = (data || []).reduce(
      (s: number, r: { tokens_estimate: number | null }) => s + Number(r.tokens_estimate || 0),
      0,
    );
    return {
      allowed: used < cap,
      used,
      cap,
      reason: used >= cap ? "monthly_ai_cap_reached" : undefined,
    };
  } catch {
    return failOpen
      ? { allowed: true, used: 0, cap }
      : { allowed: false, used: 0, cap, reason: "spend_cap_unavailable" };
  }
}

export function capExceededResponse(corsHeaders: Record<string, string>, result: SpendCapResult) {
  return new Response(
    JSON.stringify({
      error: "AI monthly spend cap reached for this organization.",
      used: result.used,
      cap: result.cap,
    }),
    { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}