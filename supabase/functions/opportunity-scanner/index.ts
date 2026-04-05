import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: orgs } = await supabase.from("organizations").select("id, name");
    if (!orgs || orgs.length === 0) throw new Error("No organizations found");
    const orgId = orgs[0].id;

    const { data: existingOpps } = await supabase.from("opportunities").select("title, source, status, deadline").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(50);
    const today = new Date().toISOString().split("T")[0];

    const { data: expiredOpps } = await supabase.from("opportunities").select("id, deadline").eq("organization_id", orgId).eq("status", "identified").lt("deadline", today);
    if (expiredOpps && expiredOpps.length > 0) {
      for (const exp of expiredOpps) {
        await supabase.from("opportunities").update({ status: "lost" }).eq("id", exp.id);
      }
    }

    const prompt = `You are an AI business intelligence agent for NIF Technical Services Ltd, an HDPE pipe installation company in Nigeria.\n\nTODAY'S DATE: ${today}\n\nEXISTING TRACKED OPPORTUNITIES (avoid duplicates):\n${JSON.stringify(existingOpps?.map(o => o.title) ?? [], null, 2)}\n\nGenerate 5-8 NEW realistic business opportunities in Nigeria for HDPE piping services.\n\nFor EACH provide: title, source, description, estimated_value (₦), deadline (YYYY-MM-DD), relevance_score (1-10), success_probability (0-100), capital_estimate, bid_strategy, competition_intensity (low/medium/high).\n\nAlso provide market_summary.\n\nReturn ONLY valid JSON:\n{"opportunities":[...],"market_summary":"..."}`;

    const response = await callAI(
      "You are an AI business development analyst for Nigerian HDPE piping companies. Return valid JSON only, no markdown.",
      prompt
    );

    if (!response.ok) throw new Error(`AI error: ${response.status}`);
    const result = await response.json();
    const rawContent = result.choices?.[0]?.message?.content ?? "";
    
    let parsed: any;
    try {
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawContent];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      parsed = { opportunities: [], market_summary: rawContent.substring(0, 500) };
    }

    const newOpps = parsed.opportunities ?? [];
    let insertedCount = 0;

    const { data: adminMember } = await supabase.from("organization_memberships").select("user_id").eq("organization_id", orgId).eq("role", "administrator").limit(1).single();
    if (!adminMember) {
      return new Response(JSON.stringify({ error: "No admin user found" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    for (const opp of newOpps) {
      const { data: existing } = await supabase.from("opportunities").select("id").eq("organization_id", orgId).ilike("title", `%${(opp.title || "").substring(0, 25)}%`).limit(1);
      if (existing && existing.length > 0) continue;

      const { error: insertError } = await supabase.from("opportunities").insert({
        organization_id: orgId, title: opp.title, source: opp.source || "Other",
        description: opp.description || "", estimated_value: opp.estimated_value || null,
        deadline: opp.deadline || null, relevance_score: opp.relevance_score || null,
        success_probability: opp.success_probability || null, capital_estimate: opp.capital_estimate || null,
        bid_strategy: opp.bid_strategy || null, competition_intensity: opp.competition_intensity || null,
        created_by: adminMember.user_id, status: "identified",
      });
      if (!insertError) insertedCount++;
    }

    const summaryText = parsed.market_summary || "Analysis complete.";
    await supabase.from("ai_summaries").insert({
      organization_id: orgId, context: "opportunities",
      summary: `${summaryText}\n\n✅ ${insertedCount} new opportunities identified. ${expiredOpps?.length ?? 0} expired removed.`,
      metadata: { opportunities_scanned: newOpps.length, opportunities_inserted: insertedCount, expired_removed: expiredOpps?.length ?? 0 },
    });

    return new Response(JSON.stringify({ success: true, inserted: insertedCount, expired_removed: expiredOpps?.length ?? 0, summary: summaryText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("opportunity-scanner error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
