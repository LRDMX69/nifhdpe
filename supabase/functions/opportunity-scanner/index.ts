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

    const prompt = `You are an AI business intelligence agent for NIF Technical Services Ltd, an HDPE pipe installation, maintenance and engineering company headquartered in Nigeria.

TODAY'S DATE: ${today}

EXISTING TRACKED OPPORTUNITIES (avoid duplicates by title):
${JSON.stringify(existingOpps?.map(o => o.title) ?? [], null, 2)}

GENERATE 6-10 NEW realistic, high-relevance business opportunities.

SOURCE MIX (do NOT limit to government tenders — actively include private sector):
- Private companies, engineering firms, EPC contractors
- Industrial / manufacturing plants
- Oil & gas operators and service companies
- Water utilities, mining, agriculture irrigation
- Recruitment portals and direct company career pages
- Government & state agencies (only as part of the mix, not the majority)

GEOGRAPHIC PRIORITY (in this order):
1. Nigeria 🇳🇬 (primary — ~60% of items)
2. Other African countries: Ghana, Kenya, South Africa, Egypt, Tanzania, Côte d'Ivoire, Senegal, etc.

INDUSTRY RELEVANCE — strongly prioritize:
- HDPE pipe supply, installation, jointing, maintenance, repair
- Industrial pipework & mechanical maintenance
- Field / mechanical engineering roles
- Oil & gas pipeline infrastructure
- Construction & pipeline engineering
Filter out irrelevant categories.

MANDATORY APPLICATION CONTACT — every opportunity MUST include a direct way to apply.
Embed the contact and application channel directly inside the "description" field using these EXACT markers (each on its own line at the END of the description):

📞 Contact: <recruiter name, phone, or company contact>
📝 How to Apply: <official email OR direct application/portal URL OR verified company contact page URL>

- If after deep research no contact is found, you MUST write exactly:
  📞 Contact: Application contact not available
  📝 How to Apply: Application contact not available
- Never omit these two lines. Never instruct the reader to "search for the email".
- Prefer real-looking corporate emails (e.g. procurement@company.com, careers@company.com) and real portal URLs.

For EACH opportunity provide:
- title (specific, includes company/agency + scope + country)
- source (e.g. "Company Career Page", "NipeX", "LinkedIn Jobs", "Ghana Public Procurement", "Direct Tender")
- description (rich paragraph + the two mandatory marker lines at the end)
- estimated_value (number, Nigerian Naira ₦; convert other currencies)
- deadline (YYYY-MM-DD, in the future)
- relevance_score (1-10, HDPE/pipeline core = 9-10)
- success_probability (0-100)
- capital_estimate (₦ capital required to execute)
- bid_strategy (1-2 sentences)
- competition_intensity ("low" | "medium" | "high")

Also provide market_summary (2-4 sentences on regional/sector trends).

Return ONLY valid JSON, no markdown fences:
{"opportunities":[...],"market_summary":"..."}`;

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
