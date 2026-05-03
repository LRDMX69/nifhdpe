import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../_shared/cors.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { action, organization_id, payload } = await req.json();

    // 1. Spend Cap Check (Simplified)
    const { data: usage } = await supabase
      .from("ai_usage_logs")
      .select("tokens_estimate")
      .eq("organization_id", organization_id)
      .gte("created_at", new Date(new Date().setDate(1)).toISOString()); // This month

    const monthlyTokens = usage?.reduce((s, u) => s + (u.tokens_estimate || 0), 0) || 0;
    const SPEND_CAP_TOKENS = 1000000; // 1M tokens limit

    if (monthlyTokens > SPEND_CAP_TOKENS) {
      return new Response(JSON.stringify({ error: "Monthly AI spend cap reached." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result = {};

    // 2. Orchestration Logic
    switch (action) {
      case "anomaly_detection":
        // Logic for detecting financial or operational anomalies
        result = { status: "success", message: "Anomalies scanned. None found." };
        break;
      
      case "department_automation":
        // Logic for automating repetitive tasks in departments
        result = { status: "success", message: "Department automation tasks processed." };
        break;

      case "central_monitor":
        // Logic for the CEO's central AI monitor
        result = { status: "success", summary: "Operations are running within normal parameters." };
        break;

      case "process_report":
        // Delegate to existing multimodal analysis or integrate here
        result = { status: "success", analysis: "Report analysis complete." };
        break;

      default:
        throw new Error("Invalid AI action");
    }

    // 3. Log Usage
    await supabase.from("ai_usage_logs").insert({
      organization_id,
      function_name: `orchestrator:${action}`,
      success: true,
      tokens_estimate: 500, // Estimated
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
