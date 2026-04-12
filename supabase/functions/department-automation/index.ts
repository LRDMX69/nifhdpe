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
    const { organization_id, department } = await req.json();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    let prompt = "";
    let context = department || "general";
    let metadata: Record<string, unknown> = {};

    switch (department) {
      case "finance": {
        const [expenses, claims] = await Promise.all([
          supabase.from("expenses").select("*").eq("organization_id", organization_id).gte("date", new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]),
          supabase.from("worker_claims").select("*").eq("organization_id", organization_id).eq("status", "pending"),
        ]);
        const totalExp = (expenses.data ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0);
        prompt = `Analyze NIF Technical finance data (7 days):\n- Expenses: ₦${totalExp.toLocaleString()} across ${expenses.data?.length ?? 0} entries\n- Pending claims: ${claims.data?.length ?? 0}\n\nProvide: 1) Spending trends 2) Cost-saving suggestions 3) Anomaly flags 4) Cash flow status. Be concise, use ₦. No markdown.`;
        metadata = { expenses: expenses.data?.length, claims: claims.data?.length };
        break;
      }
      case "hr": {
        const [attendance, leaves] = await Promise.all([
          supabase.from("attendance").select("*").eq("organization_id", organization_id).gte("date", new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]),
          supabase.from("leave_requests").select("*").eq("organization_id", organization_id).gte("created_at", sevenDaysAgo),
        ]);
        const lateCount = (attendance.data ?? []).filter((a: any) => a.check_in && new Date(a.check_in).getHours() >= 9).length;
        prompt = `Analyze NIF Technical HR data (7 days):\n- Total attendance records: ${attendance.data?.length ?? 0}\n- Late arrivals: ${lateCount}\n- Leave requests: ${leaves.data?.length ?? 0}\n\nProvide: 1) Attendance trends 2) Punctuality concerns 3) Leave patterns 4) Recommendations. No markdown.`;
        metadata = { attendance: attendance.data?.length, leaves: leaves.data?.length, late: lateCount };
        break;
      }
      case "warehouse": {
        const [inventory, equipmentData] = await Promise.all([
          supabase.from("inventory").select("*").eq("organization_id", organization_id),
          supabase.from("equipment").select("*").eq("organization_id", organization_id),
        ]);
        const lowStock = (inventory.data ?? []).filter((i: any) => Number(i.quantity_meters ?? 0) < Number(i.min_stock_level ?? 10));
        const totalValue = (inventory.data ?? []).reduce((s: number, i: any) => s + Number(i.quantity_meters ?? 0) * Number(i.unit_cost ?? 0), 0);
        prompt = `Analyze NIF Technical warehouse data:\n- Total items: ${inventory.data?.length ?? 0}\n- Low stock items: ${lowStock.length}\n- Total inventory value: ₦${totalValue.toLocaleString()}\n- Equipment: ${equipmentData.data?.length ?? 0}\n\nProvide: 1) Stock health 2) Reorder recommendations 3) Equipment status 4) Optimization suggestions. No markdown.`;
        metadata = { items: inventory.data?.length, low_stock: lowStock.length, equipment: equipmentData.data?.length };
        break;
      }
      case "engineering": {
        const [projectsData, reportsData, complianceData, deliveriesData] = await Promise.all([
          supabase.from("projects").select("*").eq("organization_id", organization_id).in("status", ["in_progress", "planning"]),
          supabase.from("field_reports").select("*").eq("organization_id", organization_id).gte("created_at", sevenDaysAgo),
          supabase.from("compliance_documents").select("*").eq("organization_id", organization_id),
          supabase.from("deliveries").select("*").eq("organization_id", organization_id).in("status", ["pending", "in_transit"]),
        ]);
        
        // Compliance expiry alerts
        const today = new Date();
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000);
        const expiringDocs = (complianceData.data ?? []).filter((d: any) => d.expiry_date && new Date(d.expiry_date) <= thirtyDaysFromNow && new Date(d.expiry_date) > today);
        const expiredDocs = (complianceData.data ?? []).filter((d: any) => d.expiry_date && new Date(d.expiry_date) <= today);
        
        // Log compliance expiry alerts
        if (expiringDocs.length > 0) {
          await supabase.from("ai_intelligence_logs").insert({
            organization_id, category: "compliance", severity: "warning",
            title: `${expiringDocs.length} compliance doc(s) expiring within 30 days`,
            details: expiringDocs.map((d: any) => `${d.title} expires ${d.expiry_date}`).join("; "),
            source_table: "compliance_documents",
          });
        }
        if (expiredDocs.length > 0) {
          await supabase.from("ai_intelligence_logs").insert({
            organization_id, category: "compliance", severity: "critical",
            title: `${expiredDocs.length} compliance doc(s) EXPIRED`,
            details: expiredDocs.map((d: any) => `${d.title} expired ${d.expiry_date}`).join("; "),
            source_table: "compliance_documents",
          });
        }

        // Delivery delay prediction
        const overdueDeliveries = (deliveriesData.data ?? []).filter((d: any) => {
          const deliveryDate = new Date(d.delivery_date);
          return deliveryDate < today && d.status !== "delivered" && d.status !== "cancelled";
        });
        if (overdueDeliveries.length > 0) {
          await supabase.from("ai_intelligence_logs").insert({
            organization_id, category: "logistics", severity: "warning",
            title: `${overdueDeliveries.length} overdue delivery(ies)`,
            details: overdueDeliveries.map((d: any) => `${d.destination} was due ${d.delivery_date}`).join("; "),
            source_table: "deliveries",
          });
        }

        // Project deadline risk prediction
        const atRiskProjects = (projectsData.data ?? []).filter((p: any) => {
          if (!p.end_date) return false;
          const daysLeft = (new Date(p.end_date).getTime() - today.getTime()) / 86400000;
          const progressNeeded = 100 - (p.progress_percent ?? 0);
          return daysLeft < 14 && progressNeeded > 30;
        });
        if (atRiskProjects.length > 0) {
          await supabase.from("ai_intelligence_logs").insert({
            organization_id, category: "projects", severity: "warning",
            title: `${atRiskProjects.length} project(s) at risk of missing deadline`,
            details: atRiskProjects.map((p: any) => `${p.name}: ${p.progress_percent ?? 0}% done, due ${p.end_date}`).join("; "),
            source_table: "projects",
          });
        }

        prompt = `Analyze NIF Technical engineering data:\n- Active projects: ${projectsData.data?.length ?? 0}\n- At-risk projects: ${atRiskProjects.length}\n- Field reports (7d): ${reportsData.data?.length ?? 0}\n- Expired compliance docs: ${expiredDocs.length}\n- Expiring soon: ${expiringDocs.length}\n- Overdue deliveries: ${overdueDeliveries.length}\n\nProvide: 1) Project progress & deadline risks 2) Safety compliance 3) Delivery status 4) Recommendations. No markdown.`;
        metadata = { projects: projectsData.data?.length, reports: reportsData.data?.length, expired_docs: expiredDocs.length, expiring_docs: expiringDocs.length, overdue_deliveries: overdueDeliveries.length, at_risk_projects: atRiskProjects.length };
        break;
      }
      default: {
        prompt = `Generate a general operational summary for NIF Technical Services. No markdown.`;
        break;
      }
    }

    const response = await callAI(
      `You are the AI analyst for the ${department || "general"} department at NIF Technical Services. Generate actionable, concise insights. No markdown. Use ₦ for currency.`,
      prompt
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const result = await response.json();
    const summary = result.choices?.[0]?.message?.content ?? "Analysis complete. No AI summary generated.";

    await supabase.from("ai_summaries").insert({ organization_id, context, summary, metadata });

    return new Response(JSON.stringify({ success: true, summary, department: context }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logger.error("department-automation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
