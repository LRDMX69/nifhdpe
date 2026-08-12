import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { isUuid } from "../_shared/auth.ts";

// Lowest-privilege bootstrap roles a user may obtain through the self-service
// sign-up path. Anything outside this set requires an administrator / the
// hidden maintenance account, and even then the roles come from the pending
// role_assignment_requests row — never from an unverified request body.
const BOOTSTRAP_ROLES = new Set([
  "technician",
  "siwes_trainee",
  "it_student",
  "nysc_member",
]);

const MAX_ROLES_PER_USER = 2;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. Identity comes from the verified JWT only.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: "invalid_token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const { user_id: targetId, organization_id: orgId, roles } = body as {
      user_id?: string;
      organization_id?: string;
      roles?: string[];
    };

    if (!isUuid(targetId) || !isUuid(orgId)) {
      return new Response(JSON.stringify({ error: "invalid_request", detail: "user_id and organization_id must be valid UUIDs" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Resolve the caller's privilege.
    const { data: maint } = await admin
      .from("system_maintenance_accounts")
      .select("user_id")
      .eq("user_id", caller.id)
      .maybeSingle();
    const isMaintenanceAdmin = !!maint;

    const { data: callerMembership } = await admin
      .from("organization_memberships")
      .select("role")
      .eq("user_id", caller.id)
      .eq("organization_id", orgId)
      .eq("role", "administrator")
      .limit(1)
      .maybeSingle();
    const isOrgAdmin = !!callerMembership;

    // 3. Determine which roles may be granted.
    let rolesToGrant: string[] = [];

    if (isMaintenanceAdmin || isOrgAdmin) {
      // Administrators may assign the roles explicitly requested — but still
      // sanitised, capped, and deduplicated. The check_max_roles trigger is the
      // final backstop for the two-roles-per-user cap. NOTE: the audit's
      // claimed "two administrators per organization" cap is NOT implemented
      // anywhere (count_visible_admins exists but is unused) — that business
      // rule is deferred to the HR session.
      const requested = Array.isArray(roles) ? roles.filter((r): r is string => typeof r === "string" && r.length > 0) : [];
      rolesToGrant = [...new Set(requested)].slice(0, MAX_ROLES_PER_USER);
    } else {
      // Self-service path: the caller may only bootstrap themselves, and only
      // with the roles that are recorded in their OWN pending request — the
      // roles in the request body are ignored entirely.
      if (caller.id !== targetId) {
        return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: pending } = await admin
        .from("role_assignment_requests")
        .select("id, requested_roles, status")
        .eq("user_id", targetId)
        .eq("organization_id", orgId)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();

      if (!pending) {
        return new Response(
          JSON.stringify({ error: "forbidden", detail: "No pending role request found for this user and organization." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const requestedRoles = Array.isArray(pending.requested_roles)
        ? (pending.requested_roles as string[]).filter((r): r is string => typeof r === "string")
        : [];
      rolesToGrant = [...new Set(requestedRoles)].filter((r) => BOOTSTRAP_ROLES.has(r)).slice(0, MAX_ROLES_PER_USER);

      if (rolesToGrant.length === 0) {
        return new Response(
          JSON.stringify({ error: "forbidden", detail: "Requested roles require administrator approval." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (rolesToGrant.length === 0) {
      return new Response(JSON.stringify({ error: "invalid_request", detail: "No valid roles supplied." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. Refuse duplicate memberships.
    const { data: existing } = await admin
      .from("organization_memberships")
      .select("user_id")
      .eq("user_id", targetId)
      .eq("organization_id", orgId)
      .limit(1);
    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: "already_assigned" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 5. Insert, then approve the pending request so it leaves the queue.
    const insertErrors: string[] = [];
    for (const role of rolesToGrant) {
      const { error: insertError } = await admin
        .from("organization_memberships")
        .insert({ user_id: targetId, organization_id: orgId, role });
      if (insertError) insertErrors.push(insertError.message);
    }
    if (insertErrors.length > 0) {
      logger.error("assign-pending-roles: membership insert failed", { targetId, orgId, rolesToGrant, insertErrors });
      return new Response(JSON.stringify({ error: "insert_failed", detail: insertErrors }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!(isMaintenanceAdmin || isOrgAdmin)) {
      await admin
        .from("role_assignment_requests")
        .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: caller.id })
        .eq("user_id", targetId)
        .eq("organization_id", orgId)
        .eq("status", "pending");
    }

    logger.info("assign-pending-roles: membership granted", { targetId, orgId, roles: rolesToGrant, by: caller.id, selfService: !(isMaintenanceAdmin || isOrgAdmin) });
    return new Response(JSON.stringify({ ok: true, roles: rolesToGrant }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    logger.error("assign-pending-roles error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "internal" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
