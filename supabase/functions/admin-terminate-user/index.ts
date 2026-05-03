import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Admin-only endpoint:
 *   action: "terminate"  -> mark profile.terminated, revoke org memberships, sign out sessions
 *   action: "delete"     -> delete the auth user (their authored work stays because FKs use ON DELETE SET NULL or no cascade)
 *
 * Caller MUST be an administrator OR a maintenance admin in the target org.
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "invalid_token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const { user_id: targetId, organization_id: orgId, action } = body as { user_id?: string; organization_id?: string; action?: string };
    if (!targetId || !orgId || !["terminate", "delete"].includes(action || "")) {
      return new Response(JSON.stringify({ error: "invalid_request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (targetId === caller.id) {
      return new Response(JSON.stringify({ error: "cannot_target_self" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Authorization: caller must be administrator in this org OR a maintenance admin
    const { data: maint } = await admin.from("system_maintenance_accounts").select("user_id").eq("user_id", caller.id).maybeSingle();
    let authorized = !!maint;
    if (!authorized) {
      const { data: callerMembership } = await admin
        .from("organization_memberships")
        .select("role")
        .eq("user_id", caller.id)
        .eq("organization_id", orgId)
        .eq("role", "administrator")
        .maybeSingle();
      authorized = !!callerMembership;
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Never allow targeting a maintenance admin
    const { data: targetMaint } = await admin.from("system_maintenance_accounts").select("user_id").eq("user_id", targetId).maybeSingle();
    if (targetMaint) {
      return new Response(JSON.stringify({ error: "target_protected" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "terminate") {
      // Remove all role memberships in this org (so they can't access anything)
      await admin.from("organization_memberships").delete().eq("user_id", targetId).eq("organization_id", orgId);
      // Mark profile terminated
      await admin.from("profiles").update({
        terminated: true,
        terminated_at: new Date().toISOString(),
        terminated_by: caller.id,
      }).eq("user_id", targetId);
      // Force sign-out everywhere
      try { await admin.auth.admin.signOut(targetId); } catch (_) { /* noop */ }
      return new Response(JSON.stringify({ ok: true, action: "terminate" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // action === "delete" — hard delete the auth user (work records remain, owner becomes null where allowed)
    const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
    if (delErr) {
      return new Response(JSON.stringify({ error: "delete_failed", detail: delErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ ok: true, action: "delete" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "internal" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
