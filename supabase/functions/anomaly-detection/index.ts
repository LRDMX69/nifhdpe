import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { rateLimitMiddleware, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { logger } from "../_shared/logger.ts";
import { validateServiceOrUser, isUuid } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { isCronOrServiceRequest } from "../_shared/cronAuth.ts";
import { isAutoModeEnabled, autoModeSkippedResponse } from "../_shared/autoMode.ts";
import { callAI } from "../_shared/aiProvider.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Apply rate limiting (AI functions are expensive, use strict limits)
  const rateLimitResponse = await rateLimitMiddleware(req, RATE_LIMITS.AI_FUNCTION);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { organization_id } = await req.json();
    if (!isUuid(organization_id)) {
      return new Response(JSON.stringify({ error: "invalid organization_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate that the user is authorized for this organization
    await validateServiceOrUser(req, organization_id);

    const isScheduled = await isCronOrServiceRequest(req);
    if (isScheduled) {
      if (!(await isAutoModeEnabled(organization_id))) {
        return autoModeSkippedResponse(corsHeaders, organization_id);
      }
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: payments } = await supabase.from("worker_payments").select("*").eq("organization_id", organization_id).order("date", { ascending: false }).limit(100);
    const { data: expenses } = await supabase.from("expenses").select("*").eq("organization_id", organization_id).order("date", { ascending: false }).limit(100);

    const prompt = `Analyze these financial transactions for anomalies:\n\nPAYMENTS:\n\`\`\`json\n${JSON.stringify(payments ?? [], null, 2)}\n\`\`\`\n\nEXPENSES:\n\`\`\`json\n${JSON.stringify(expenses ?? [], null, 2)}\n\`\`\`\n\nDetect:\n1. Duplicate reimbursements\n2. Abnormal cost spikes\n3. Unusual payment patterns\n4. Fuel overspending\n5. Maintenance cost anomalies\n\nBe concise. Flag only genuine concerns. Use ₦.`;

    const aiResult = await callAI(
      "You are an AI financial anomaly detector for NIF Technical, an HDPE pipe company in Nigeria.",
      prompt,
      { organizationId: organization_id, functionName: "anomaly-detection", strictSpendCap: isScheduled },
    );

    if (!aiResult.ok) {
      return new Response(
        JSON.stringify({ success: false, error: aiResult.error }),
        { status: aiResult.status === 402 || aiResult.status === 429 ? aiResult.status : 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const summary = aiResult.content;

    await supabase.from("ai_summaries").insert({
      organization_id, context: "finance", summary,
      metadata: { payments_analyzed: payments?.length ?? 0, expenses_analyzed: expenses?.length ?? 0 },
    });

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logger.error("anomaly-detection error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
