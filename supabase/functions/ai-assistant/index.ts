import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  inventory: `You are an AI inventory analyst for an HDPE/PVC pipe company (NIF Technical) in Nigeria. Analyze the provided inventory data and give insights on:
- Demand forecasting based on usage patterns
- Stock shortage predictions
- Abnormal usage detection
- Reorder quantity suggestions
Keep responses concise, actionable, and specific to pipe/fittings inventory. Use Nigerian Naira (₦) for costs.`,

  projects: `You are an AI project analyst for an HDPE pipe installation company (NIF Technical) in Nigeria. Analyze project data and provide:
- Delay risk predictions based on progress vs deadline
- Cost deviation alerts (actual vs budget)
- Resource conflict detection
- Completion timeline estimates
Keep responses concise and actionable.`,

  field_reports: `You are an AI field operations assistant for NIF Technical, an HDPE pipe company. Help with:
- Summarizing messy daily field notes into structured reports
- Troubleshooting suggestions for pipe installation issues
- Flagging abnormal material usage patterns
- Safety incident analysis
Keep responses practical and field-focused.`,

  clients: `You are an AI CRM assistant for NIF Technical, an HDPE pipe company in Nigeria. Provide:
- Follow-up timing recommendations based on client activity
- Client conversion predictions based on quotation history
- Maintenance schedule reminders
- Client relationship insights
Keep responses concise and business-focused.`,

  finance: `You are an AI financial analyst for NIF Technical, an HDPE pipe company in Nigeria. Analyze financial data and provide:
- Profit leakage detection across projects
- Cash flow forecasting
- Margin analysis and optimization insights
- Cost reduction recommendations
Use Nigerian Naira (₦). Keep responses actionable.`,

  equipment: `You are an AI equipment management assistant for NIF Technical. Analyze equipment data and provide:
- Predictive maintenance alerts based on usage hours
- Breakdown risk estimation
- Optimal maintenance scheduling
- Equipment utilization insights
Keep responses practical and maintenance-focused.`,

  knowledge: `You are a technical AI assistant for NIF Technical, specializing in HDPE and PVC pipe engineering. Answer questions about:
- Fusion procedures (butt fusion, electrofusion, socket fusion)
- Pipe sizing and pressure ratings (SDR classes)
- Installation best practices
- Troubleshooting common issues
- Safety procedures
Provide accurate technical information. Reference ISO standards where applicable.`,

  opportunities: `You are an AI business development assistant for NIF Technical, an HDPE pipe company in Nigeria. Help with:
- Opportunity relevance ranking for tenders
- Bid strategy recommendations
- Win/loss pattern analysis
- Market trend insights for Nigerian infrastructure
Keep responses strategic and actionable.`,

  general: `You are an AI assistant for NIF Technical Operations Suite, an HDPE and PVC pipe company in Nigeria. Help with operational queries, provide insights, and assist with decision-making. Be concise and professional.`,
};

async function callGemini(systemPrompt: string, userMessage: string, stream: boolean) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

  // Prefer Lovable AI gateway (free, no rate limits)
  if (LOVABLE_API_KEY) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream,
      }),
    });
    // Only return if truly successful (2xx status)
    if (res.ok) return res;
    // If it's a 502 (gateway error), try fallback
    // Otherwise, it's a real error (401, 402, 429, etc.) - don't return it
    if (res.status === 502) {
      console.warn("Lovable AI gateway returned 502, trying fallback");
    } else {
      // Log the error but don't return - let it fall through to fallback or throw
      console.error(`Lovable AI gateway error: ${res.status} ${res.statusText}`);
    }
  }

  // Fallback to direct Gemini
  if (GEMINI_API_KEY) {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream,
      }),
    });
    // Only return if truly successful
    if (res.ok) return res;
    // Log error but don't return
    console.error(`Gemini API error: ${res.status} ${res.statusText}`);
  }

  throw new Error("No AI API key configured or all AI services failed (LOVABLE_API_KEY or GEMINI_API_KEY)");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { context, prompt, data } = await req.json();

    const systemPrompt = SYSTEM_PROMPTS[context] || SYSTEM_PROMPTS.general;
    const userMessage = data
      ? `Here is the relevant data:\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n\nUser query: ${prompt}`
      : prompt;

    const response = await callGemini(systemPrompt, userMessage, true);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
