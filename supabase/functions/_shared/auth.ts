import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get user from the JWT
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    throw new Error("Invalid token");
  }

  // Verify membership in the organization
  const { data: membership, error: memberError } = await supabase
    .from("user_organizations")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .single();

  if (memberError || !membership) {
    throw new Error("Unauthorized access to this organization");
  }

  return user;
}
