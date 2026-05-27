import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { rateLimitMiddleware, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { logger } from "../_shared/logger.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { validateServiceOrUser } from "../_shared/auth.ts";
import { isCronOrServiceRequest } from "../_shared/cronAuth.ts";


import { callAI, safeExtractJSON } from "../_shared/aiProvider.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Apply rate limiting (AI functions are expensive, use strict limits)
  const rateLimitResponse = await rateLimitMiddleware(req, RATE_LIMITS.AI_FUNCTION);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Cron/internal call (service role or cron shared secret) OR authenticated admin user.
    const isCronOrService = await isCronOrServiceRequest(req);
    if (!isCronOrService) {
      // Require an authenticated user that belongs to the targeted org.
      let bodyOrg = "";
      try { bodyOrg = (await req.clone().json())?.organization_id ?? ""; } catch { /* noop */ }
      if (!bodyOrg) {
        return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await validateServiceOrUser(req, bodyOrg);
    }
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

    const aiResult = await callAI(
      "You are an AI business development analyst for Nigerian HDPE piping companies. Return valid JSON only, no markdown.",
      prompt,
    );

    if (!aiResult.ok) {
      return new Response(
        JSON.stringify({ success: false, inserted: 0, expired_removed: expiredOpps?.length ?? 0, error: aiResult.error }),
        { status: aiResult.status === 402 ? 402 : 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rawContent = aiResult.content;
    const extracted = safeExtractJSON<{ opportunities?: unknown[]; market_summary?: string }>(rawContent);
    const parsed = extracted ?? { opportunities: [], market_summary: rawContent.substring(0, 500) };

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
    logger.error("opportunity-scanner error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
