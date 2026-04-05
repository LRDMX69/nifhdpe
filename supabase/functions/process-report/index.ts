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
      body: JSON.stringify({ model: "google/gemini-2.5-flash-lite", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }] }),
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
      body: JSON.stringify({ model: "gemini-2.0-flash-lite", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }] }),
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
    const body = await req.json();
    const fieldReportId = body.field_report_id ?? body.reportId;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!fieldReportId) throw new Error("field_report_id or reportId required");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: report, error: reportErr } = await supabase
      .from("field_reports").select("*, projects(name, description, clients(name))").eq("id", fieldReportId).single();

    if (reportErr || !report) throw new Error("Report not found: " + (reportErr?.message ?? ""));

    const { data: photos } = await supabase.from("field_report_photos").select("*").eq("field_report_id", fieldReportId);

    const prompt = `Structure this raw field report into a professional engineering report.\n\nPROJECT: ${report.projects?.name ?? "Unknown"}\nCLIENT: ${report.projects?.clients?.name ?? "Unknown"}\nDATE: ${report.report_date}\nCREW: ${report.crew_members ?? "Not specified"}\n\nRAW NOTES:\n${report.notes ?? report.tasks_completed ?? "No notes"}\n\nTASKS COMPLETED:\n${report.tasks_completed ?? "Not specified"}\n\nPRESSURE TEST: ${report.pressure_test_result ?? "Not recorded"}\nSAFETY INCIDENTS: ${report.safety_incidents ?? "None"}\nCLIENT FEEDBACK: ${report.client_feedback ?? "None"}\nPHOTOS: ${photos?.length ?? 0}\n\nGenerate:\n1. Executive Summary\n2. Work Completed\n3. Technical Observations\n4. Safety Status\n5. Issues & Recommendations\n6. Next Steps\n\nUse professional engineering language. Be concise.`;

    const response = await callAI(
      "You are an AI report structuring assistant for NIF Technical, an HDPE pipe installation company in Nigeria.",
      prompt
    );

    if (!response.ok) throw new Error(`AI error: ${response.status}`);
    const aiResult = await response.json();
    const structuredContent = aiResult.choices?.[0]?.message?.content ?? "Failed to structure report";

    await supabase.from("structured_reports").insert({ field_report_id: fieldReportId, structured_content: structuredContent });

    await supabase.from("ai_summaries").insert({
      organization_id: report.organization_id, context: "field_report",
      summary: `📋 New Field Report Processed\n\nProject: ${report.projects?.name ?? "General"}\nDate: ${report.report_date}\n\n${structuredContent.substring(0, 400)}...`,
      metadata: { field_report_id: fieldReportId, processed_at: new Date().toISOString() },
    });

    return new Response(JSON.stringify({ success: true, structured_content: structuredContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
