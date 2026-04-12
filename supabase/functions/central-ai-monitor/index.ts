import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { rateLimitMiddleware, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { logger } from "../_shared/logger.ts";
import { validateUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface IntelLog {
  organization_id: string;
  category: string;
  severity: string;
  title: string;
  details: string;
  source_table?: string;
  metadata?: Record<string, unknown>;
}

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

    // Validate that the user is authorized for this organization
    await validateUser(req, organization_id);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const today = new Date().toISOString().split("T")[0];
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    // Gather cross-department data
    const [attendance, reports, claims, expenses, payments, messages, equipment, leaves, projects] = await Promise.all([
      supabase.from("attendance").select("*").eq("organization_id", organization_id).eq("date", today),
      supabase.from("field_reports").select("id, created_by, report_date, safety_incidents, notes").eq("organization_id", organization_id).gte("created_at", threeDaysAgo),
      supabase.from("worker_claims").select("id, user_id, category, amount, status, created_at, claim_type, description").eq("organization_id", organization_id).gte("created_at", sevenDaysAgo),
      supabase.from("expenses").select("id, amount, category, date, description, created_by").eq("organization_id", organization_id).gte("date", today),
      supabase.from("worker_payments").select("id, amount, type, date, user_id, description").eq("organization_id", organization_id).gte("date", threeDaysAgo.split("T")[0]),
      supabase.from("messages").select("id, sender_id, recipient_id, message_type, created_at, body").eq("organization_id", organization_id).gte("created_at", threeDaysAgo),
      supabase.from("equipment").select("id, name, status, usage_hours, next_maintenance_date").eq("organization_id", organization_id),
      supabase.from("leave_requests").select("id, user_id, status, start_date, end_date, leave_type").eq("organization_id", organization_id).eq("status", "pending"),
      supabase.from("projects").select("id, name, status, progress_percent, budget").eq("organization_id", organization_id).in("status", ["in_progress", "planning"]),
    ]);

    const logs: IntelLog[] = [];

    // --- Attendance anomalies ---
    const attendanceCount = attendance.data?.length ?? 0;
    const { count: memberCount } = await supabase.from("organization_memberships").select("*", { count: "exact", head: true }).eq("organization_id", organization_id);
    const absenteeRate = memberCount ? ((memberCount - attendanceCount) / memberCount * 100) : 0;
    if (absenteeRate > 30) {
      logs.push({ organization_id, category: "attendance", severity: "warning", title: `High absenteeism: ${absenteeRate.toFixed(0)}% absent today`, details: `Only ${attendanceCount} of ${memberCount} members checked in.`, source_table: "attendance", metadata: { absent_rate: absenteeRate, checked_in: attendanceCount, total: memberCount } });
    }

    const lateCheckins = (attendance.data ?? []).filter((a: any) => a.check_in && new Date(a.check_in).getHours() >= 9);
    if (lateCheckins.length > 2) {
      logs.push({ organization_id, category: "attendance", severity: "info", title: `${lateCheckins.length} late check-ins today`, details: `${lateCheckins.length} workers checked in after 9 AM.`, source_table: "attendance" });
    }

    // --- Safety incidents ---
    const safetyReports = (reports.data ?? []).filter((r: any) => r.safety_incidents && r.safety_incidents.trim().length > 0 && r.safety_incidents.toLowerCase() !== "none");
    if (safetyReports.length > 0) {
      logs.push({ organization_id, category: "safety", severity: "critical", title: `${safetyReports.length} safety incident(s) in last 3 days`, details: safetyReports.map(r => r.safety_incidents).join("; ").substring(0, 500), source_table: "field_reports" });
    }

    // --- Financial anomalies ---
    const todayExpenses = (expenses.data ?? []).reduce((s, e) => s + Number(e.amount), 0);
    if (todayExpenses > 500000) {
      logs.push({ organization_id, category: "finance", severity: "warning", title: `High daily spending: ₦${todayExpenses.toLocaleString()}`, details: `Today's expenses exceed ₦500,000.`, source_table: "expenses" });
    }

    const largeExpenses = (expenses.data ?? []).filter(e => Number(e.amount) > 200000);
    for (const exp of largeExpenses) {
      logs.push({ organization_id, category: "finance", severity: "warning", title: `Large transaction: ₦${Number(exp.amount).toLocaleString()}`, details: `Category: ${exp.category}. ${exp.description || "No description"}.`, source_table: "expenses" });
    }

    // Duplicate payments
    const paymentsByKey = new Map<string, any[]>();
    (payments.data ?? []).forEach(p => {
      const key = `${p.user_id}-${p.amount}`;
      if (!paymentsByKey.has(key)) paymentsByKey.set(key, []);
      paymentsByKey.get(key)!.push(p);
    });
    for (const [, dupes] of paymentsByKey) {
      if (dupes.length >= 2) {
        logs.push({ organization_id, category: "finance", severity: "warning", title: `Potential duplicate payment: ₦${Number(dupes[0].amount).toLocaleString()} x${dupes.length}`, details: `${dupes.length} payments of same amount to same user within 3 days.`, source_table: "worker_payments" });
      }
    }

    // --- Claims ---
    const claimsByUser = new Map<string, any[]>();
    (claims.data ?? []).forEach(c => {
      if (!claimsByUser.has(c.user_id)) claimsByUser.set(c.user_id, []);
      claimsByUser.get(c.user_id)!.push(c);
    });
    for (const [userId, userClaims] of claimsByUser) {
      if (userClaims.length >= 3) {
        const totalAmount = userClaims.reduce((s: number, c: any) => s + Number(c.amount ?? 0), 0);
        logs.push({ organization_id, category: "claims", severity: "warning", title: `User submitted ${userClaims.length} claims in 7 days (₦${totalAmount.toLocaleString()})`, details: `Categories: ${[...new Set(userClaims.map((c: any) => c.category))].join(", ")}`, source_table: "worker_claims" });
      }
    }

    // --- Equipment ---
    const overdueEquipment = (equipment.data ?? []).filter(e => e.next_maintenance_date && new Date(e.next_maintenance_date) < new Date());
    if (overdueEquipment.length > 0) {
      logs.push({ organization_id, category: "equipment", severity: "warning", title: `${overdueEquipment.length} equipment overdue for maintenance`, details: overdueEquipment.map(e => `${e.name} (due: ${e.next_maintenance_date})`).join(", "), source_table: "equipment" });
    }

    // --- Stalled projects ---
    const stalledProjects = (projects.data ?? []).filter(p => p.status === "in_progress" && (p.progress_percent ?? 0) < 20);
    if (stalledProjects.length > 0) {
      logs.push({ organization_id, category: "projects", severity: "info", title: `${stalledProjects.length} project(s) potentially stalled`, details: stalledProjects.map(p => `${p.name}: ${p.progress_percent ?? 0}%`).join(", "), source_table: "projects" });
    }

    // --- Leave requests ---
    const pendingLeaves = leaves.data ?? [];
    if (pendingLeaves.length > 3) {
      logs.push({ organization_id, category: "hr", severity: "info", title: `${pendingLeaves.length} pending leave requests`, details: `Leave types: ${[...new Set(pendingLeaves.map((l: any) => l.leave_type))].join(", ")}`, source_table: "leave_requests" });
    }

    // --- Daily summary ---
    const msgData = messages.data ?? [];
    logs.push({ organization_id, category: "operations", severity: "info", title: `Daily: ${reports.data?.length ?? 0} reports, ${attendanceCount} check-ins, ${claims.data?.length ?? 0} claims`, details: `Reports: ${reports.data?.length ?? 0}, Attendance: ${attendanceCount}/${memberCount ?? "?"}, Claims: ${claims.data?.length ?? 0}, Messages: ${msgData.length}`, source_table: "field_reports" });

    if (logs.length > 0) {
      await supabase.from("ai_intelligence_logs").insert(logs);
    }

    // Generate AI executive summary
    const aiPrompt = `You are the Central AI Monitor for NIF Technical Services. Generate a concise executive intelligence brief.\n\nFLAGS DETECTED:\n${JSON.stringify(logs.map(l => ({ category: l.category, severity: l.severity, title: l.title })), null, 2)}\n\nProvide:\n1. Priority actions (max 3)\n2. Risk assessment\n3. Operational health score (1-10)\n4. Financial health note\n5. Any fraud or security concerns\n\nBe direct. Use ₦. Max 250 words. No markdown.`;

    const response = await callAI(
      "You are an invisible Central AI monitoring system for NIF Technical. Generate brief, actionable intelligence for admin eyes only. No markdown.",
      aiPrompt
    );

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const result = await response.json();
    const aiSummary = result.choices?.[0]?.message?.content ?? "Monitoring complete. No AI summary generated.";

    await supabase.from("ai_summaries").insert({
      organization_id, context: "central_ai", summary: aiSummary,
      metadata: { flags_generated: logs.length, categories: [...new Set(logs.map(l => l.category))], generated_at: new Date().toISOString() },
    });

    return new Response(JSON.stringify({ success: true, flags: logs.length, summary: aiSummary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logger.error("central-ai-monitor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
