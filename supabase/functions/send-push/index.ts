import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import webpush from "npm:web-push@3.6.7";

serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const body = await req.json();
    const { subscription, payload } = body;
    if (!subscription) return new Response('Missing subscription', { status: 400 });

    // Use env vars if set, otherwise fall back to provided VAPID keys (local dev)
    const FALLBACK_VAPID = {
      subject: 'mailto:stanleyvic13@gmail.com',
      publicKey: 'BPJIGtC6wIzWhfeH2sujerAdeuh2t1zQWSfCTcG_bnbyV-t6-5ZBj3FD_IdOcqTj2lKf45oXhm8Vlupr1KJLlHU',
      privateKey: 'SJyteCffUOUMUcchvHHgvsJZ4500F43QbiyKKrSGQT0',
    };

    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') || Deno.env.get('VITE_VAPID_PUBLIC_KEY') || FALLBACK_VAPID.publicKey;
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY') || Deno.env.get('VITE_VAPID_PRIVATE_KEY') || FALLBACK_VAPID.privateKey;
    const subject = Deno.env.get('VAPID_SUBJECT') || FALLBACK_VAPID.subject;

    if (!publicKey || !privateKey) return new Response('Missing VAPID keys', { status: 500 });

    const options = {
      vapidDetails: {
        subject,
        publicKey,
        privateKey,
      },
      TTL: 60,
    };

    await webpush.sendNotification(subscription, JSON.stringify(payload || {}), options);
    return new Response('Sent', { status: 200 });
  } catch (err) {
    console.error('send-push error', err);
    return new Response('Error', { status: 500 });
  }
});
