import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !caller) return new Response(JSON.stringify({ error: "invalid_token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const { user_id: targetId, organization_id: orgId, roles } = body as { user_id?: string; organization_id?: string; roles?: string[] };
    if (!targetId || !orgId || !Array.isArray(roles) || roles.length === 0) {
      return new Response(JSON.stringify({ error: "invalid_request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // SECURITY: self-assignment is only permitted for the explicitly safe, lowest-privilege
    // bootstrap roles. Every other role must be granted by an administrator / maintenance admin.
    const SELF_ASSIGNABLE_ROLES = new Set(["technician", "trainee"]);
    const isSelfAssign = caller.id === targetId;
    const { data: maint } = await admin
      .from("system_maintenance_accounts")
      .select("user_id")
      .eq("user_id", caller.id)
      .maybeSingle();
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
      if (!isSelfAssign) {
        return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const elevated = roles.find((r) => !SELF_ASSIGNABLE_ROLES.has(r));
      if (elevated) {
        return new Response(JSON.stringify({ error: "forbidden", detail: `Role '${elevated}' requires administrator approval` }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Ensure target has no memberships in this org already
    const { data: existing } = await admin.from("organization_memberships").select("user_id").eq("user_id", targetId).eq("organization_id", orgId);
    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: "already_assigned" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const insertErrors: string[] = [];
    for (const role of roles.slice(0, 2)) {
      const { error: insertError } = await admin.from("organization_memberships").insert({ user_id: targetId, organization_id: orgId, role });
      if (insertError) insertErrors.push(insertError.message);
    }

    if (insertErrors.length > 0) {
      return new Response(JSON.stringify({ error: "insert_failed", detail: insertErrors }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "internal" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
