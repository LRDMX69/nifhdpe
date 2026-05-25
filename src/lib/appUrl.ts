/**
 * Centralized helper for all auth redirect URLs.
 * In production builds we ALWAYS route auth callbacks to the canonical
 * Vercel deployment so confirmation / reset / OAuth links never expose
 * the lovable.app preview domain.
 */
const PRODUCTION_URL = "https://nifhdpe.vercel.app";

export const getAppUrl = (): string => {
  if (typeof window === "undefined") return PRODUCTION_URL;
  const host = window.location.hostname;
  // Local dev: keep current origin so emails come back to localhost.
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
    return window.location.origin;
  }
  // Any non-local environment (preview or production) → canonical Vercel URL.
  return PRODUCTION_URL;
};

export const getAuthRedirect = (path = "/dashboard"): string => {
  const base = getAppUrl();
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
};