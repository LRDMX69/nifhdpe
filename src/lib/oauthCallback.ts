import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

/**
 * Handles the OAuth callback when the Lovable broker redirects back to the
 * app after Google sign-in.
 *
 * The Lovable Cloud auth SDK does a full-page navigation to the broker when
 * the app is NOT running inside a Lovable preview iframe (i.e. on Vercel, on
 * the published nifhdpe.lovable.app domain, on custom domains, and inside an
 * installed PWA). The broker authenticates with Google, then redirects back
 * to `redirect_uri` with the Supabase access/refresh tokens encoded in the
 * URL — typically in the hash fragment (`#access_token=...&refresh_token=...`)
 * but sometimes in the query string.
 *
 * Without this handler the tokens sit unused in the URL and the user remains
 * signed out. We parse them, hand them to Supabase, then strip them from the
 * URL so they don't leak into history or referrer headers.
 *
 * Returns true when a session was applied so callers can avoid racing with
 * `getSession()`.
 */
export async function consumeOAuthCallback(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const { hash, search } = window.location;
  const hashParams = hash.startsWith("#") ? new URLSearchParams(hash.slice(1)) : new URLSearchParams();
  const queryParams = new URLSearchParams(search);

  // Surface broker / provider errors first.
  const oauthError = hashParams.get("error") || queryParams.get("error");
  if (oauthError) {
    const description = hashParams.get("error_description") || queryParams.get("error_description") || oauthError;
    logger.error("OAuth callback error:", description);
    cleanUrl();
    return false;
  }

  const access_token = hashParams.get("access_token") || queryParams.get("access_token");
  const refresh_token = hashParams.get("refresh_token") || queryParams.get("refresh_token");

  if (!access_token || !refresh_token) return false;

  try {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      logger.error("setSession from OAuth callback failed:", error);
      cleanUrl();
      return false;
    }
    cleanUrl();
    return true;
  } catch (err) {
    logger.error("Unexpected error consuming OAuth callback:", err);
    cleanUrl();
    return false;
  }
}

function cleanUrl() {
  try {
    const url = new URL(window.location.href);
    ["access_token", "refresh_token", "expires_in", "expires_at", "token_type", "provider_token", "provider_refresh_token", "state", "error", "error_description", "error_code"].forEach((k) => url.searchParams.delete(k));
    url.hash = "";
    window.history.replaceState({}, document.title, url.pathname + url.search);
  } catch {
    // best-effort cleanup
  }
}