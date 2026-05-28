import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

/**
 * Admin-only endpoint:
 *   action: "terminate"  -> mark profile.terminated, revoke org memberships, sign out sessions
 *   action: "delete"     -> delete the auth user (their authored work stays because FKs use ON DELETE SET NULL or no cascade)
 *
 * Caller MUST be an administrator OR a maintenance admin in the target org.
 *
 * IMPORTANT: All authorization lookups go through the caller's JWT (userClient + RPCs)
 * because the service-role JWT is currently affected by PostgREST clock-skew (iat in
 * future) which causes silent empty results from .from() reads. The service-role
 * client is only used for GoTrue admin APIs (signOut / deleteUser) which validate the
 * bearer at the auth service directly, not via PostgREST.
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "invalid_token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Use the caller's JWT for any PostgREST read — avoids the service-role
    // clock-skew issue that silently returns empty rows.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => ({}));
    const { user_id: targetId, organization_id: orgId, action } = body as { user_id?: string; organization_id?: string; action?: string };
    if (!targetId || !orgId || !["terminate", "delete"].includes(action || "")) {
      return new Response(JSON.stringify({ error: "invalid_request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (targetId === caller.id) {
      return new Response(JSON.stringify({ error: "cannot_target_self" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Authorization: caller must be a maintenance admin OR org administrator.
    // Use RPCs through the user's JWT (RPCs are SECURITY DEFINER and bypass RLS internally).
    const [{ data: isMaint }, { data: isOrgAdmin }, { data: targetIsMaint }] = await Promise.all([
      userClient.rpc("is_maintenance_admin", { _uid: caller.id }),
      userClient.rpc("has_org_role", { _user_id: caller.id, _org_id: orgId, _role: "administrator" }),
      userClient.rpc("is_maintenance_admin", { _uid: targetId }),
    ]);

    const authorized = isMaint === true || isOrgAdmin === true;
    if (!authorized) {
      logger.warn("terminate_forbidden", { caller: caller.id, target: targetId, org: orgId, isMaint, isOrgAdmin });
      return new Response(JSON.stringify({ error: "forbidden", detail: "Caller is not an administrator of this organization." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Never allow targeting a maintenance admin
    if (targetIsMaint === true) {
      return new Response(JSON.stringify({ error: "target_protected" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "terminate") {
      // Remove all role memberships in this org (so they can't access anything)
      const { error: delMembershipsErr } = await admin
        .from("organization_memberships")
        .delete()
        .eq("user_id", targetId)
        .eq("organization_id", orgId);
      if (delMembershipsErr) {
        logger.error("terminate_revoke_memberships_failed", delMembershipsErr);
        return new Response(JSON.stringify({ error: "revoke_failed", detail: delMembershipsErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Mark profile terminated
      const { error: updProfileErr } = await admin.from("profiles").update({
        terminated: true,
        terminated_at: new Date().toISOString(),
        terminated_by: caller.id,
      }).eq("user_id", targetId);
      if (updProfileErr) {
        logger.error("terminate_mark_profile_failed", updProfileErr);
        return new Response(JSON.stringify({ error: "profile_update_failed", detail: updProfileErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Force sign-out everywhere
      try { await admin.auth.admin.signOut(targetId); } catch (e) { logger.warn("terminate_signout_warn", e); }
      logger.info("user_terminated", { caller: caller.id, target: targetId, org: orgId });
      return new Response(JSON.stringify({ ok: true, action: "terminate" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // action === "delete" — hard delete the auth user (work records remain, owner becomes null where allowed)
    const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
    if (delErr) {
      logger.error("delete_user_failed", { caller: caller.id, target: targetId, msg: delErr.message });
      return new Response(JSON.stringify({ error: "delete_failed", detail: delErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    logger.info("user_deleted", { caller: caller.id, target: targetId });
    return new Response(JSON.stringify({ ok: true, action: "delete" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    logger.error("admin_terminate_internal", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "internal" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
