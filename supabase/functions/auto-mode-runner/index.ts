import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { rateLimitMiddleware, RATE_LIMITS } from "../_shared/rateLimit.ts";
import { logger } from "../_shared/logger.ts";
import { corsHeaders } from "../_shared/cors.ts";

const MAX_EXECUTION_MS = 5 * 60 * 1000; // 5 minutes max

/**
 * Auto-Mode Runner: Runs all department automations + central monitor.
 * Enforces a 5-minute execution window — skips remaining tasks if exceeded.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const rateLimitResponse = rateLimitMiddleware(req, RATE_LIMITS.PROCESSING);
  if (rateLimitResponse) return rateLimitResponse;

  const startTime = Date.now();
  const isTimeExceeded = () => Date.now() - startTime > MAX_EXECUTION_MS;

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: autoModeOrgs } = await supabase
      .from("auto_mode_settings")
      .select("organization_id")
      .eq("enabled", true);

    if (!autoModeOrgs || autoModeOrgs.length === 0) {
      return new Response(JSON.stringify({ message: "No organizations with auto-mode enabled." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ org: string; departments: string[]; skipped: string[]; flags: number }> = [];

    const callWithTimeout = async (url: string, body: Record<string, unknown>): Promise<boolean> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60s per call max
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        return res.ok;
      } catch (e) {
        logger.error(`Call failed: ${url}`, e);
        return false;
      } finally {
        clearTimeout(timeout);
      }
    };

    for (const org of autoModeOrgs) {
      if (isTimeExceeded()) {
        results.push({ org: org.organization_id, departments: [], skipped: ["ALL — time exceeded"], flags: 0 });
        continue;
      }

      const orgId = org.organization_id;
      const completedDepts: string[] = [];
      const skippedDepts: string[] = [];

      // Run central monitor
      if (!isTimeExceeded()) {
        const ok = await callWithTimeout(`${SUPABASE_URL}/functions/v1/central-ai-monitor`, { organization_id: orgId });
        if (ok) completedDepts.push("central-monitor"); else skippedDepts.push("central-monitor");
      } else { skippedDepts.push("central-monitor"); }

      // Run message moderation
      if (!isTimeExceeded()) {
        const ok = await callWithTimeout(`${SUPABASE_URL}/functions/v1/message-moderation`, { organization_id: orgId });
        if (ok) completedDepts.push("message-moderation"); else skippedDepts.push("message-moderation");
      } else { skippedDepts.push("message-moderation"); }

      // Run each department automation
      const departments = ["finance", "hr", "warehouse", "engineering"];
      for (const dept of departments) {
        if (isTimeExceeded()) {
          skippedDepts.push(dept);
          continue;
        }
        const ok = await callWithTimeout(`${SUPABASE_URL}/functions/v1/department-automation`, { organization_id: orgId, department: dept });
        if (ok) completedDepts.push(dept); else skippedDepts.push(dept);
      }

      results.push({ org: orgId, departments: completedDepts, skipped: skippedDepts, flags: 0 });
    }

    const elapsed = Date.now() - startTime;
    return new Response(JSON.stringify({ success: true, results, elapsed_ms: elapsed, time_limit_ms: MAX_EXECUTION_MS }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logger.error("auto-mode-runner error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
