// CORS for all edge functions.
//
// We intentionally use "*" here so requests from any Lovable preview / Vercel
// preview / custom domain succeed without per-function wiring. Functions are
// still protected by JWT validation + rate limiting (and by isCronOrServiceRequest
// for cron-invoked functions), so the wildcard is a defence-in-depth gap only.
//
// NOTE: an origin allow-list helper existed here and was deliberately removed
// because it broke preview-origin requests. If an allow-list is ever
// re-introduced, include the Lovable preview origins and deploy it together
// with the frontend domain configuration.
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
