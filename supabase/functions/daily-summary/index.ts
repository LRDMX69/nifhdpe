import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { rateLimitMiddleware, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { logger } from "../_shared/logger.ts";

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
    const { organization_id } = await req.json();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [projects, inventory, expenses, payments, reports, equipment, attendance] = await Promise.all([
      supabase.from("projects").select("*").eq("organization_id", organization_id).in("status", ["in_progress", "planning"]),
      supabase.from("inventory").select("*").eq("organization_id", organization_id),
      supabase.from("expenses").select("*").eq("organization_id", organization_id).order("date", { ascending: false }).limit(50),
      supabase.from("worker_payments").select("*").eq("organization_id", organization_id).order("date", { ascending: false }).limit(50),
      supabase.from("field_reports").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false }).limit(10),
      supabase.from("equipment").select("*").eq("organization_id", organization_id),
      supabase.from("attendance").select("*").eq("organization_id", organization_id).eq("date", new Date().toISOString().split("T")[0]),
    ]);

    const lowStock = (inventory.data ?? []).filter((i: any) => i.quantity_meters !== null && i.min_stock_level !== null && i.quantity_meters < i.min_stock_level);

    const prompt = `Generate a daily executive summary for NIF Technical operations:\n\nACTIVE PROJECTS: ${projects.data?.length ?? 0}\nLOW STOCK ITEMS: ${lowStock.length}\nRECENT EXPENSES TOTAL: ₦${(expenses.data ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0).toLocaleString()}\nRECENT PAYMENTS TOTAL: ₦${(payments.data ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0).toLocaleString()}\nFIELD REPORTS TODAY: ${reports.data?.length ?? 0}\nEQUIPMENT COUNT: ${equipment.data?.length ?? 0}\nATTENDANCE TODAY: ${attendance.data?.length ?? 0}\n\nProvide:\n1. Executive Summary\n2. Critical Alerts\n3. Risk Assessment\n4. Key Metrics\n5. Recommended Actions\n\nBe concise, strategic, data-driven. Use ₦.`;

    const response = await callAI("You are an AI executive assistant for NIF Technical, generating daily operational intelligence briefs.", prompt);

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }
    const result = await response.json();
    const summary = result.choices?.[0]?.message?.content ?? "Summary generation failed";

    await supabase.from("ai_summaries").insert({
      organization_id, context: "admin_daily", summary,
      metadata: { projects: projects.data?.length ?? 0, low_stock: lowStock.length, generated_at: new Date().toISOString() },
    });

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logger.error("daily-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
