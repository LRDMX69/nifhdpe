// @ts-expect-error - Deno http module import type mismatch
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error - Deno import type mismatch for supabase-js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { rateLimitMiddleware, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { logger } from "../_shared/logger.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { validateServiceOrUser, isUuid } from "../_shared/auth.ts";
import { isCronOrServiceRequest } from "../_shared/cronAuth.ts";
import { isAutoModeEnabled, autoModeSkippedResponse } from "../_shared/autoMode.ts";


interface RiskResult {
  id: string;
  risk_score: number;
  risk_category?: string;
  flagged_content?: string | null;
  details?: string | null;
}

import { callAI, safeExtractJSON } from "../_shared/aiProvider.ts";

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
    if (await isCronOrServiceRequest(req)) {
      if (!(await isAutoModeEnabled(organization_id))) {
        return autoModeSkippedResponse(corsHeaders, organization_id);
      }
    }
    // @ts-expect-error - Deno.env type mismatch
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    // @ts-expect-error - Deno.env type mismatch
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("id, sender_id, recipient_id, body, message_type, created_at")
      .eq("organization_id", organization_id)
      .gte("created_at", tenMinAgo)
      .order("created_at", { ascending: false })
      .limit(50);

    if (msgError) throw msgError;
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ success: true, scanned: 0, flagged: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageIds = messages.map((m: { id: string }) => m.id);
    const { data: existingScans } = await supabase
      .from("message_risk_logs").select("message_id").in("message_id", messageIds);

    const scannedIds = new Set((existingScans ?? []).map((s: { message_id: string }) => s.message_id));
    const unscanned = messages.filter((m: { id: string }) => !scannedIds.has(m.id));

    if (unscanned.length === 0) {
      return new Response(JSON.stringify({ success: true, scanned: 0, flagged: 0, note: "All recent messages already scanned" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageBatch = unscanned.map((m: { id: string; body: string | null; message_type: string; created_at: string }) => ({ 
      id: m.id, 
      body: (m.body || "").substring(0, 500).replace(/<\/?script/gi, ""), 
      type: m.message_type, 
      time: m.created_at 
    }));

    const aiPrompt = `Analyze the following workplace messages for security risks (fraud, coercion, data exfiltration, policy violations).

[MESSAGE_BATCH]
${JSON.stringify(messageBatch, null, 2)}

[INSTRUCTIONS]
Return ONLY a JSON array with this schema:
[{"id":"<message_id>","risk_score":<0-100>,"risk_category":"<fraud|coercion|data_leak|policy_violation|safety|none>","flagged_content":"<phrase or null>","details":"<explanation or null>"}]

Only include entries where risk_score >= 30. Valid JSON only, no markdown.`;

    const aiResult = await callAI(
      "You are a security AI that analyzes workplace messages for fraud, coercion, and policy violations. Return only valid JSON arrays.",
      aiPrompt,
      { organizationId: organization_id, functionName: "message-moderation" },
    );

    if (!aiResult.ok) {
      logger.warn(`message-moderation skipped: ${aiResult.error}`);
      return new Response(
        JSON.stringify({ success: false, scanned: unscanned.length, flagged: 0, reason: aiResult.error }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed = safeExtractJSON<RiskResult[]>(aiResult.content);
    const analysisResults: RiskResult[] = Array.isArray(parsed) ? parsed : [];
    if (!Array.isArray(parsed)) {
      logger.error("Failed to parse moderation AI JSON; first 200 chars:", aiResult.content.substring(0, 200));
    }

    const flagged = analysisResults.filter((r) => r.risk_score >= 30);
    if (flagged.length > 0) {
      const riskLogs = flagged.map((r) => ({
        message_id: r.id, organization_id, risk_score: r.risk_score,
        risk_category: r.risk_category || "unknown", flagged_content: r.flagged_content || null, details: r.details || null,
      }));
      await supabase.from("message_risk_logs").insert(riskLogs);

      if (flagged.some((r) => r.risk_score >= 60)) {
        const criticalFlags = flagged.filter((r) => r.risk_score >= 60);
        await supabase.from("ai_intelligence_logs").insert({
          organization_id, category: "messaging_security", severity: "critical",
          title: `${criticalFlags.length} high-risk message(s) detected`,
          details: criticalFlags.map((r) => `[${r.risk_category}] Score: ${r.risk_score} - ${r.details}`).join("\n"),
          source_table: "messages",
        });
      }
    }

    const flaggedCount = analysisResults.filter((r) => r.risk_score >= 30).length;
    return new Response(JSON.stringify({ success: true, scanned: unscanned.length, flagged: flaggedCount, high_risk: analysisResults.filter((r) => r.risk_score >= 60).length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logger.error("message-moderation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
