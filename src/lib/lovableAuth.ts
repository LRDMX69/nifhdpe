import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Absolute OAuth broker URL.
 *
 * The Lovable Cloud OAuth proxy worker only intercepts `/~oauth/*` on
 * `*.lovable.app` hosts. On the IDE preview (`*.lovableproject.com`), on
 * Vercel, and on any custom non-lovable.app domain, that path falls through to
 * the SPA and renders the 404 page.
 *
 * By pinning the broker to the published lovable.app URL we get a working
 * OAuth popup everywhere: IDE preview, published app, and any Vercel /
 * custom-domain deployment.
 */
const BROKER_URL = "https://nifhdpe.lovable.app/~oauth/initiate";

const auth = createLovableAuth({ oauthBrokerUrl: BROKER_URL });

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovableAuth = {
  signInWithOAuth: async (
    provider: "google" | "apple" | "microsoft" | "lovable",
    opts?: SignInOptions,
  ) => {
    const result = await auth.signInWithOAuth(provider, {
      redirect_uri: opts?.redirect_uri,
      extraParams: opts?.extraParams,
    });

    if (result.redirected || result.error) return result;

    try {
      await supabase.auth.setSession(result.tokens);
    } catch (e) {
      return { error: e instanceof Error ? e : new Error(String(e)) };
    }
    return result;
  },
};