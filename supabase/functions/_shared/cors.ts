
// Allow-list of trusted origins. Override per-environment via ALLOWED_ORIGIN
// (comma-separated list). Falls back to known production + Lovable preview hosts.
const DEFAULT_ALLOWED = [
  "https://nifhdpe.lovable.app",
  "https://id-preview--94e98d52-289e-425e-aecd-1482a0843ec6.lovable.app",
];

const envAllowed = (Deno.env.get("ALLOWED_ORIGIN") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = new Set<string>([...DEFAULT_ALLOWED, ...envAllowed]);

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get("origin") || "";
  const allowOrigin =
    ALLOWED_ORIGINS.has(origin) ||
    /^https:\/\/.*\.lovable\.app$/.test(origin) ||
    /^https:\/\/.*\.vercel\.app$/.test(origin)
      ? origin
      : DEFAULT_ALLOWED[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Vary": "Origin",
  };
}

// Backwards-compatible static export (kept so existing imports keep working).
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": envAllowed[0] || DEFAULT_ALLOWED[0],
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Vary": "Origin",
};
