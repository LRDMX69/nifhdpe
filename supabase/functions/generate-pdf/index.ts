import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { logger } from "../_shared/logger.ts";
import { rateLimitMiddleware, RATE_LIMITS } from "../_shared/rateLimit.ts";

import { corsHeaders } from "../_shared/cors.ts";
import { validateUser, isUuid } from "../_shared/auth.ts";


serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rateLimitResponse = await rateLimitMiddleware(req, RATE_LIMITS.PROCESSING);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await req.json();
    // Strict validation
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "invalid_request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const organization_id = body.organization_id;
    if (!title || title.length > 200) {
      return new Response(JSON.stringify({ error: "invalid_title" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!isUuid(organization_id)) {
      return new Response(JSON.stringify({ error: "invalid organization_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Limit payload size to 100 KB
    const payloadSize = new TextEncoder().encode(JSON.stringify(body)).length;
    if (payloadSize > 100_000) {
      return new Response(JSON.stringify({ error: "payload_too_large" }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    await validateUser(req, organization_id);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Insert a job to be processed by a worker (not implemented here).
    const { data, error } = await supabase.from("pdf_jobs").insert({
      title,
      payload: body,
      status: "queued",
      created_at: new Date().toISOString(),
    }).select("id").limit(1).single();

    if (error) {
      logger.error("generate-pdf: job insert failed", error.message || error);
      return new Response(JSON.stringify({ error: "job_enqueue_failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ queued: true, jobId: data.id }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    logger.error("generate-pdf error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
