import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { rateLimitMiddleware, RATE_LIMITS } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Auto-Mode Runner: When auto_mode is enabled for an org, this function
 * runs all department automations + central monitor automatically.
 * Called by cron or manually by admin.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Apply rate limiting (processing functions use moderate limits)
  const rateLimitResponse = rateLimitMiddleware(req, RATE_LIMITS.PROCESSING);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find all orgs with auto-mode enabled
    const { data: autoModeOrgs } = await supabase
      .from("auto_mode_settings")
      .select("organization_id")
      .eq("enabled", true);

    if (!autoModeOrgs || autoModeOrgs.length === 0) {
      return new Response(JSON.stringify({ message: "No organizations with auto-mode enabled." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ org: string; departments: string[]; flags: number }> = [];

    for (const org of autoModeOrgs) {
      const orgId = org.organization_id;
      const departments = ["finance", "hr", "warehouse", "engineering"];
      const completedDepts: string[] = [];

      // Run central monitor
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/central-ai-monitor`, {
          method: "POST",
          headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ organization_id: orgId }),
        });
        completedDepts.push("central-monitor");
      } catch (e) {
        console.error(`Central monitor failed for ${orgId}:`, e);
      }

      // Run message content moderation
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/message-moderation`, {
          method: "POST",
          headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ organization_id: orgId }),
        });
        completedDepts.push("message-moderation");
      } catch (e) {
        console.error(`Message moderation failed for ${orgId}:`, e);
      }

      // Run each department automation
      for (const dept of departments) {
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/department-automation`, {
            method: "POST",
            headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ organization_id: orgId, department: dept }),
          });
          completedDepts.push(dept);
        } catch (e) {
          console.error(`Dept ${dept} failed for ${orgId}:`, e);
        }
      }

      results.push({ org: orgId, departments: completedDepts, flags: 0 });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-mode-runner error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
