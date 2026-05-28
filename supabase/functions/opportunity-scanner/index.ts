import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import { rateLimitMiddleware, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { logger } from "../_shared/logger.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { validateServiceOrUser } from "../_shared/auth.ts";
import { isCronOrServiceRequest } from "../_shared/cronAuth.ts";


import { callAI, safeExtractJSON } from "../_shared/aiProvider.ts";

// Direct Postgres pool (bypasses PostgREST to avoid current JWT-clock issues with rotated keys).
const DB_URL = Deno.env.get("SUPABASE_DB_URL")!;
const pool = new Pool(DB_URL, 2, true);

async function dbQuery<T = Record<string, unknown>>(sql: string, args: unknown[] = []): Promise<T[]> {
  const client = await pool.connect();
  try {
    const res = await client.queryObject<T>({ text: sql, args });
    return res.rows;
  } finally {
    client.release();
  }
}

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

    const orgs = await dbQuery<{ id: string; name: string }>(`SELECT id, name FROM public.organizations ORDER BY created_at ASC LIMIT 1`);
    if (orgs.length === 0) throw new Error("No organizations found");
    const orgId = orgs[0].id;

    const existingOpps = await dbQuery<{ title: string }>(
      `SELECT title FROM public.opportunities WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [orgId],
    );
    const today = new Date().toISOString().split("T")[0];

    const expired = await dbQuery<{ id: string }>(
      `UPDATE public.opportunities SET status='lost'
         WHERE organization_id=$1 AND status='identified' AND deadline < $2::date
       RETURNING id`,
      [orgId, today],
    );

    const prompt = `You are an AI business intelligence agent for NIF Technical Services Ltd, an HDPE pipe installation company in Nigeria.\n\nTODAY'S DATE: ${today}\n\nEXISTING TRACKED OPPORTUNITIES (avoid duplicates):\n${JSON.stringify(existingOpps?.map(o => o.title) ?? [], null, 2)}\n\nGenerate 5-8 NEW realistic business opportunities in Nigeria for HDPE piping services.\n\nFor EACH provide: title, source, description, estimated_value (₦), deadline (YYYY-MM-DD), relevance_score (1-10), success_probability (0-100), capital_estimate, bid_strategy, competition_intensity (low/medium/high).\n\nAlso provide market_summary.\n\nReturn ONLY valid JSON:\n{"opportunities":[...],"market_summary":"..."}`;

    const aiResult = await callAI(
      "You are an AI business development analyst for Nigerian HDPE piping companies. Return valid JSON only, no markdown.",
      prompt,
    );

    if (!aiResult.ok) {
      return new Response(
        JSON.stringify({ success: false, inserted: 0, expired_removed: expired.length, error: aiResult.error }),
        { status: aiResult.status === 402 ? 402 : 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rawContent = aiResult.content;
    const extracted = safeExtractJSON<{ opportunities?: unknown[]; market_summary?: string }>(rawContent);
    const parsed = extracted ?? { opportunities: [], market_summary: rawContent.substring(0, 500) };

    const newOpps = (parsed.opportunities ?? []) as Array<Record<string, unknown>>;
    let insertedCount = 0;

    const admins = await dbQuery<{ user_id: string }>(
      `SELECT user_id FROM public.organization_memberships WHERE organization_id=$1 AND role='administrator' LIMIT 1`,
      [orgId],
    );
    if (admins.length === 0) {
      return new Response(JSON.stringify({ error: "No admin user found" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const adminUserId = admins[0].user_id;

    for (const opp of newOpps) {
      const title = String(opp.title ?? "").trim();
      if (!title) continue;
      const dupes = await dbQuery<{ id: string }>(
        `SELECT id FROM public.opportunities WHERE organization_id=$1 AND title ILIKE $2 LIMIT 1`,
        [orgId, `%${title.substring(0, 25)}%`],
      );
      if (dupes.length > 0) continue;
      try {
        await dbQuery(
          `INSERT INTO public.opportunities
            (organization_id, title, source, description, estimated_value, deadline,
             relevance_score, success_probability, capital_estimate, bid_strategy,
             competition_intensity, created_by, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'identified')`,
          [
            orgId,
            title,
            (opp.source as string) || "Other",
            (opp.description as string) || "",
            opp.estimated_value ?? null,
            opp.deadline ?? null,
            opp.relevance_score ?? null,
            opp.success_probability ?? null,
            opp.capital_estimate ?? null,
            opp.bid_strategy ?? null,
            opp.competition_intensity ?? null,
            adminUserId,
          ],
        );
        insertedCount++;
      } catch (e) {
        logger.error("insert opportunity failed", e);
      }
    }

    const summaryText = parsed.market_summary || "Analysis complete.";
    try {
      await dbQuery(
        `INSERT INTO public.ai_summaries (organization_id, context, summary, metadata)
         VALUES ($1, 'opportunities', $2, $3::jsonb)`,
        [
          orgId,
          `${summaryText}\n\n✅ ${insertedCount} new opportunities identified. ${expired.length} expired removed.`,
          JSON.stringify({ opportunities_scanned: newOpps.length, opportunities_inserted: insertedCount, expired_removed: expired.length }),
        ],
      );
    } catch (e) {
      logger.warn("ai_summaries insert failed", e);
    }

    return new Response(JSON.stringify({ success: true, inserted: insertedCount, expired_removed: expired.length, summary: summaryText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logger.error("opportunity-scanner error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
