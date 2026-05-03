// @ts-expect-error
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { rateLimitMiddleware, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { logger } from "../_shared/logger.ts";
import { validateUser } from "../_shared/auth.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface ReportRecord {
  organization_id: string;
  report_date: string;
  projects?: {
    name: string;
  };
}

async function callAI(systemPrompt: string, userMessage: string) {
  // @ts-expect-error
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  // @ts-expect-error
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  
  if (LOVABLE_API_KEY) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }] }),
    });
    // Only return if truly successful (2xx status)
    if (res.ok) return res;
    // If it's a 502 (gateway error), try fallback
    if (res.status === 502) {
      logger.warn("Lovable AI gateway returned 502, trying fallback");
    } else {
      logger.error(`Lovable AI gateway error: ${res.status} ${res.statusText}`);
    }
  }
  
  if (GEMINI_API_KEY) {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gemini-2.0-flash-lite", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }] }),
    });
    // Only return if truly successful
    if (res.ok) return res;
    logger.error(`Gemini API error: ${res.status} ${res.statusText}`);
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
      const body = await req.json();
    const fieldReportId = body.field_report_id ?? body.reportId;
    // @ts-expect-error
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    // @ts-expect-error
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!fieldReportId) throw new Error("field_report_id or reportId required");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: report, error: reportErr } = await supabase
      .from("field_reports").select("*, projects(name, description, clients(name))").eq("id", fieldReportId).single();

    if (reportErr || !report) throw new Error("Report not found: " + (reportErr?.message ?? ""));

    // Validate that the user is authorized for this organization
    await validateUser(req, report.organization_id);

    const { data: photos } = await supabase.from("field_report_photos").select("*").eq("field_report_id", fieldReportId);

    const photoCount = photos?.length ?? 0;
    const rawNotes = (report.notes ?? report.tasks_completed ?? "No notes").replace(/<\/?script/gi, "");
    const tasks = (report.tasks_completed ?? "Not specified").replace(/<\/?script/gi, "");

    const prompt = `Structure the following raw data into a professional engineering report for NIF Technical (Nigeria).

[METADATA]
PROJECT: ${report.projects?.name ?? "Unknown"}
CLIENT: ${report.projects?.clients?.name ?? "Unknown"}
DATE: ${report.report_date}
CREW: ${report.crew_members ?? "Not specified"}
PRESSURE TEST: ${report.pressure_test_result ?? "Not recorded"}
SAFETY INCIDENTS: ${report.safety_incidents ?? "None"}
CLIENT FEEDBACK: ${report.client_feedback ?? "None"}
PHOTOS: ${photoCount}

[RAW_USER_NOTES]
${rawNotes}

[USER_TASKS_COMPLETED]
${tasks}

[INSTRUCTIONS]
Generate:
1. Executive Summary
2. Work Completed
3. Technical Observations
4. Safety Status
5. Issues & Recommendations
6. Next Steps

Use professional engineering language. Be concise.`;

    const response = await callAI(
      "You are an AI report structuring assistant for NIF Technical, an HDPE pipe installation company in Nigeria.",
      prompt
    );

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }
    const result = await response.json();
    const structuredContent = result.choices?.[0]?.message?.content ?? "Failed to structure report";

    await supabase.from("structured_reports").insert({ field_report_id: fieldReportId, structured_content: structuredContent });

    const rData = report as unknown as ReportRecord;
    await supabase.from("ai_summaries").insert({
      organization_id: rData.organization_id, context: "field_report",
      summary: `📋 New Field Report Processed\n\nProject: ${rData.projects?.name ?? "General"}\nDate: ${rData.report_date}\n\n${structuredContent.substring(0, 400)}...`,
      metadata: { field_report_id: fieldReportId, processed_at: new Date().toISOString() },
    });

    return new Response(JSON.stringify({ success: true, structured_content: structuredContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logger.error("process-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
