import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { rateLimitMiddleware, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { logger } from "../_shared/logger.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { validateServiceOrUser, isUuid } from "../_shared/auth.ts";
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

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: attendance } = await supabase.from("attendance").select("*").eq("organization_id", organization_id).gte("date", thirtyDaysAgo);
    const { data: leaves } = await supabase.from("leave_requests").select("*").eq("organization_id", organization_id).gte("created_at", thirtyDaysAgo);

    const prompt = `Analyze HR data for the past 30 days:\n\nATTENDANCE:\n\`\`\`json\n${JSON.stringify(attendance ?? [], null, 2)}\n\`\`\`\n\nLEAVE REQUESTS:\n\`\`\`json\n${JSON.stringify(leaves ?? [], null, 2)}\n\`\`\`\n\nProvide:\n1. Absenteeism trends\n2. Irregular check-in patterns\n3. Productivity concerns\n4. Leave pattern analysis\n5. Recommendations\n\nBe concise and actionable.`;

    const aiResult = await callAI(
      "You are an AI HR analyst for NIF Technical.",
      prompt,
      { organizationId: organization_id, functionName: "hr-analysis", strictSpendCap: isScheduled },
    );

    if (!aiResult.ok) {
      return new Response(
        JSON.stringify({ success: false, error: aiResult.error }),
        { status: aiResult.status === 402 || aiResult.status === 429 ? aiResult.status : 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const summary = aiResult.content;

    await supabase.from("ai_summaries").insert({
      organization_id, context: "hr", summary,
      metadata: { attendance_records: attendance?.length ?? 0, leave_requests: leaves?.length ?? 0 },
    });

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logger.error("hr-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
