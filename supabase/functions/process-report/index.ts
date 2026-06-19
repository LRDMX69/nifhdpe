// @ts-expect-error - Deno http module import type mismatch
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error - Deno import type mismatch for supabase-js
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

const BANNED_PHRASES = [
  "next step", "next steps",
  "recommend", "recommendation",
  "should consider", "we should", "you should",
  "suggest", "suggestion",
  "it is advisable", "it would be advisable",
  "going forward",
  "assumption", "assume",
  "in conclusion", "to conclude", "in summary",
  "to address this", "moving forward",
  "TBD", "to be determined", "placeholder",
];

function containsBanned(text: string): boolean {
  const low = text.toLowerCase();
  return BANNED_PHRASES.some((p) => low.includes(p));
}

async function callAI(systemPrompt: string, userMessage: string) {
  // @ts-expect-error - Deno.env type mismatch
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  // @ts-expect-error - Deno.env type mismatch
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
  const rateLimitResponse = await rateLimitMiddleware(req, RATE_LIMITS.AI_FUNCTION);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
      const body = await req.json();
    const fieldReportId = body.field_report_id ?? body.reportId;
    // @ts-expect-error - Deno.env type mismatch
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    // @ts-expect-error - Deno.env type mismatch
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!fieldReportId) throw new Error("field_report_id or reportId required");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: report, error: reportErr } = await supabase
      .from("field_reports").select("*, projects(name, description, clients(name))").eq("id", fieldReportId).single();

    if (reportErr || !report) throw new Error("Report not found: " + (reportErr?.message ?? ""));

    // Validate that the user is authorized for this organization
    await validateUser(req, report.organization_id);

    const { checkSpendCap, capExceededResponse } = await import("../_shared/spendCap.ts");
    const cap = await checkSpendCap(report.organization_id);
    if (!cap.allowed) return capExceededResponse(corsHeaders, cap);

    // Auto-fill author metadata from the actual submitter
    const authorId = report.created_by;
    let authorName = "Unknown";
    let authorRole = "Staff";
    if (authorId) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", authorId)
        .maybeSingle();
      authorName = prof?.full_name ?? authorName;
      const { data: mem } = await supabase
        .from("organization_memberships")
        .select("role")
        .eq("user_id", authorId)
        .eq("organization_id", report.organization_id)
        .limit(1)
        .maybeSingle();
      authorRole = mem?.role ?? authorRole;
    }

    const { data: photos } = await supabase.from("field_report_photos").select("*").eq("field_report_id", fieldReportId);

    const photoCount = photos?.length ?? 0;
    const sanitize = (s: string | null | undefined) =>
      (s ?? "").replace(/<\/?script/gi, "").trim();
    const rawNotes = sanitize(report.notes ?? report.tasks_completed);
    const tasks = sanitize(report.tasks_completed);
    const projectName = report.projects?.name ?? null;
    const clientName = report.projects?.clients?.name ?? null;

    // Editor-only prompt. AI cleans grammar and organizes; it must NOT add content.
    const userInput = [
      tasks ? `Tasks completed:\n${tasks}` : "",
      rawNotes && rawNotes !== tasks ? `Notes:\n${rawNotes}` : "",
      sanitize(report.pressure_test_result) ? `Pressure test: ${sanitize(report.pressure_test_result)}` : "",
      sanitize(report.safety_incidents) ? `Safety incidents: ${sanitize(report.safety_incidents)}` : "",
      sanitize(report.client_feedback) ? `Client feedback: ${sanitize(report.client_feedback)}` : "",
    ].filter(Boolean).join("\n\n");

    const editorSystemPrompt =
      "You are a professional copy editor for field reports at NIF Technical Services Ltd (Nigeria). " +
      "Your ONLY job: fix grammar, spelling, punctuation, and clarity while preserving the author's EXACT meaning and facts. " +
      "You MUST NOT add recommendations, next steps, suggestions, conclusions, business advice, assumptions, interpretations, " +
      "predictions, executive summaries, or any content the author did not state. " +
      "You MUST NOT invent client names, project names, dates, names, numbers, or any factual detail. " +
      "You MUST NOT output placeholders like [TBD], [Client Name], or [Insert]. " +
      "If the input is one sentence, the output is one sentence. " +
      "Output ONLY the cleaned text — no preamble, no headings, no sign-off, no markdown.";

    let cleanedBody = rawNotes; // safe fallback
    if (userInput.trim().length > 0) {
      try {
        const response = await callAI(editorSystemPrompt, userInput);
        if (response.ok) {
          const result = await response.json();
          const aiText = (result.choices?.[0]?.message?.content ?? "").trim();
          try {
            await supabase.from("ai_usage_logs").insert({
              organization_id: report.organization_id,
              function_name: "process-report",
              success: true,
              tokens_estimate: Math.ceil((editorSystemPrompt.length + userInput.length + aiText.length) / 4),
            });
          } catch { /* non-fatal */ }
          if (aiText && !containsBanned(aiText)) {
            cleanedBody = aiText;
          } else if (aiText && containsBanned(aiText)) {
            logger.warn("AI output contained banned phrases — using original text", { fieldReportId });
          }
        }
      } catch (aiErr) {
        logger.warn("AI editor unavailable — using original text", { fieldReportId, err: String(aiErr) });
      }
    }

    // Build the final structured report deterministically from real DB facts only.
    // No AI-invented metadata. Missing facts simply do not appear.
    const headerLines: string[] = [];
    if (projectName) headerLines.push(`Project: ${projectName}`);
    if (clientName) headerLines.push(`Client: ${clientName}`);
    headerLines.push(`Report Date: ${report.report_date}`);
    headerLines.push(`Submitted By: ${authorName}${authorRole ? ` (${authorRole})` : ""}`);
    if (report.crew_members) headerLines.push(`Crew: ${sanitize(report.crew_members)}`);
    if (photoCount > 0) headerLines.push(`Photos Attached: ${photoCount}`);
    headerLines.push(`Processed: ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`);

    const structuredContent = `${headerLines.join("\n")}\n\n${cleanedBody || "(No narrative provided.)"}`;

    await supabase.from("structured_reports").insert({ field_report_id: fieldReportId, structured_content: structuredContent });

    const rData = report as unknown as ReportRecord;
    await supabase.from("ai_summaries").insert({
      organization_id: rData.organization_id, context: "field_report",
      summary: `New Field Report\n\nProject: ${projectName ?? "—"}\nDate: ${rData.report_date}\nBy: ${authorName}\n\n${cleanedBody.substring(0, 300)}${cleanedBody.length > 300 ? "…" : ""}`,
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
