import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

/**
 * Allows internal/cron calls that present the service-role key as Bearer.
 * Otherwise enforces validateUser against the supplied organization id.
 */
export async function validateServiceOrUser(req: Request, organizationId: string) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (token && serviceKey && token === serviceKey) return { service: true } as const;
  if (!isUuid(organizationId)) throw new Error("invalid organization_id");
  const user = await validateUser(req, organizationId);
  return { service: false, user } as const;
}

/**
 * Validates the user's JWT from the request and checks if they belong to the specified organization.
 * Returns the user object if valid, or throws an error if invalid.
 */
export async function validateUser(req: Request, organizationId: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  // Separate client that runs queries as the calling user so PostgREST clock-skew
  // issues with the service-role JWT don't break basic membership lookups.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Get user from the JWT
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    throw new Error("Invalid token");
  }

  // Verify maintenance bypass or membership using the user's JWT (avoids service-role clock skew).
  const { data: isMaint } = await userClient.rpc("is_maintenance_admin", { _uid: user.id });
  if (isMaint === true) return user;

  const { data: isMember } = await userClient.rpc("is_member_of_org", {
    _user_id: user.id,
    _org_id: organizationId,
  });

  if (!isMember) {
    throw new Error("Unauthorized access to this organization");
  }

  return user;
}
