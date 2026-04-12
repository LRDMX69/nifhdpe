import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { rateLimitMiddleware, RATE_LIMITS } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callAI(systemPrompt: string, userMessage: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  
  if (LOVABLE_API_KEY) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }] }),
    });
    // Only return if truly successful (2xx status)
    if (res.ok) return res;
    // If it's a 502 (gateway error), try fallback
    if (res.status === 502) {
      console.warn("Lovable AI gateway returned 502, trying fallback");
    } else {
      console.error(`Lovable AI gateway error: ${res.status} ${res.statusText}`);
    }
  }
  
  if (GEMINI_API_KEY) {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gemini-2.0-flash", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }] }),
    });
    // Only return if truly successful
    if (res.ok) return res;
    console.error(`Gemini API error: ${res.status} ${res.statusText}`);
  }
  
  throw new Error("No AI API key configured or all AI services failed (LOVABLE_API_KEY or GEMINI_API_KEY)");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Apply rate limiting (AI functions are expensive, use strict limits)
  const rateLimitResponse = rateLimitMiddleware(req, RATE_LIMITS.AI_FUNCTION);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { organization_id } = await req.json();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: inventory } = await supabase.from("inventory").select("*").eq("organization_id", organization_id);

    if (!inventory || inventory.length === 0) {
      return new Response(JSON.stringify({ summary: "No inventory data to analyze." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Analyze this inventory data for an HDPE pipe company:\n\`\`\`json\n${JSON.stringify(inventory, null, 2)}\n\`\`\`\n\nProvide:\n1. Items at risk of depletion (below min stock)\n2. Predicted depletion dates\n3. Reorder suggestions with timing\n4. Any abnormal patterns\n\nBe concise and actionable. Use ₦ for costs.`;

    const response = await callAI("You are an AI inventory analyst for NIF Technical, an HDPE pipe company in Nigeria.", prompt);

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }
    const result = await response.json();
    const summary = result.choices?.[0]?.message?.content ?? "Analysis failed";

    await supabase.from("ai_summaries").insert({
      organization_id, context: "warehouse", summary,
      metadata: { items_analyzed: inventory.length, analyzed_at: new Date().toISOString() },
    });

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stock-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
