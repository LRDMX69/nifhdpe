import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

    // Require an authenticated caller — either a signed-in user OR the service role (for cron / server-side use).
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '').trim();
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!token) return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    if (token !== serviceKey) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const sb = createClient(SUPABASE_URL, serviceKey);
      const { data: { user }, error } = await sb.auth.getUser(token);
      if (error || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { subscription, payload } = body;
    if (!subscription || typeof subscription !== 'object') return new Response('Missing subscription', { status: 400, headers: corsHeaders });

    // VAPID keys must come from secrets — no hardcoded fallback.
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com';
    if (!publicKey || !privateKey) {
      console.error('send-push: VAPID keys not configured');
      return new Response('Push service not configured', { status: 500, headers: corsHeaders });
    }

    const options = {
      vapidDetails: {
        subject,
        publicKey,
        privateKey,
      },
      TTL: 60,
    };

    await webpush.sendNotification(subscription, JSON.stringify(payload || {}), options);
    return new Response('Sent', { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('send-push error', err);
    return new Response('Error', { status: 500, headers: corsHeaders });
  }
});
