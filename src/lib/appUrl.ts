export const getAppUrl = (): string => {
  if (typeof window === "undefined") return "https://nifhdpe.lovable.app";
  return window.location.origin;
};

export const getAuthRedirect = (path = "/dashboard"): string => {
  const base = getAppUrl();
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
};