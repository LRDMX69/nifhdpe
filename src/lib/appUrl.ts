/**
 * Returns the current app origin. ALWAYS use this for OAuth redirects, magic
 * links, password resets, and any emailed callback URL.
 *
 * Because this resolves to `window.location.origin`, the user is always sent
 * back to whichever host they came from — Vercel, Lovable, preview, or a
 * custom domain — without any hardcoding. Do NOT hardcode a domain here.
 */
export const getAppUrl = (): string => {
  if (typeof window === "undefined") return "";
  return window.location.origin;
};

export const getAuthRedirect = (path = "/dashboard"): string => {
  const base = getAppUrl();
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
};