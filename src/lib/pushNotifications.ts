/**
 * Web Push Notification System
 * Handles service worker registration, permission requests, and local notifications.
 * Falls back to storing notifications for display on next app open.
 */

let swRegistration: ServiceWorkerRegistration | null = null;
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Subscribe the current user to push and store subscription server-side */
export async function subscribeToPush(vapidPublicKey?: string, userId?: string, orgId?: string) {
  try {
    if (!swRegistration) return null;
    if (!('PushManager' in window)) return null;
    const existing = await swRegistration.pushManager.getSubscription();
    if (existing) return existing;
    if (!vapidPublicKey) vapidPublicKey = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_VAPID_PUBLIC_KEY;
    const sub = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey || ''),
    });
    // Store subscription to DB
    try {
      type SupabaseWithPush = typeof supabase & { from(table: 'push_subscriptions'): { upsert(data: unknown, options: { onConflict: string }): Promise<unknown> } };
      await (supabase as unknown as SupabaseWithPush).from('push_subscriptions').upsert({
        user_id: userId || null,
        organization_id: orgId || null,
        endpoint: sub.endpoint,
        keys: sub.toJSON().keys as unknown as Json,
      }, { onConflict: 'endpoint' });
    } catch (e) {
      // best-effort
      console.warn('Failed to persist push subscription', e);
    }
    return sub;
  } catch (e) {
    console.warn('subscribeToPush failed', e);
    return null;
  }
}

/** Register the service worker */
export async function registerServiceWorker(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service workers not supported");
    return false;
  }
  // Block registration inside iframes or Lovable preview hosts
  const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const isPreview = window.location.hostname.includes("id-preview--") || window.location.hostname.includes("lovableproject.com");
  if (isInIframe || isPreview) {
    return false;
  }
  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js");
    return true;
  } catch (err) {
    console.error("SW registration failed:", err);
    return false;
  }
}

/** Request notification permission */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return await Notification.requestPermission();
}

/** Show a local notification (works when app is in background/another tab) */
export async function showNotification(title: string, body: string, data?: Record<string, unknown>): Promise<boolean> {
  // Always emit an in-app toast so the user gets feedback even when
  // OS-level notifications are denied or blocked by the platform (iOS Safari, etc.)
  try {
    const { toast } = await import("sonner");
    toast(title, { description: body });
  } catch { /* noop */ }

  // Service worker notification (works when tab is backgrounded on supported browsers)
  if (swRegistration && "Notification" in window && Notification.permission === "granted") {
    try {
      await swRegistration.showNotification(title, {
        body,
        icon: "/nif-logo.png",
        badge: "/icon-192.png",
        data,
      } as NotificationOptions);
      return true;
    } catch (e) {
      console.warn("SW notification failed, trying fallback:", e);
    }
  }

  // Direct Notification API
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/nif-logo.png" });
      return true;
    } catch (e) {
      console.warn("Notification API failed:", e);
    }
  }

  // Final fallback: store for next app open
  storeOfflineNotification(title, body, data);
  return false;
}

/** Store notification for display on next app open */
function storeOfflineNotification(title: string, body: string, data?: Record<string, unknown>) {
  try {
    const stored = JSON.parse(localStorage.getItem("pending_notifications") || "[]");
    stored.push({ title, body, data, timestamp: Date.now() });
    // Keep max 50
    if (stored.length > 50) stored.splice(0, stored.length - 50);
    localStorage.setItem("pending_notifications", JSON.stringify(stored));
  } catch (e) {
    // silent
  }
}

/** Get and clear stored offline notifications */
export function getStoredNotifications(): Array<{ title: string; body: string; data?: Record<string, unknown>; timestamp: number }> {
  try {
    const stored = JSON.parse(localStorage.getItem("pending_notifications") || "[]");
    localStorage.removeItem("pending_notifications");
    return stored;
  } catch {
    return [];
  }
}

/** Initialize push notification system */
export async function initPushNotifications(): Promise<void> {
  const registered = await registerServiceWorker();
  
  // Explicitly request permission if not already handled
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }

  // Show any stored offline notifications
  const stored = getStoredNotifications();
  for (const n of stored) {
    if (Date.now() - n.timestamp < 24 * 60 * 60 * 1000) {
      showNotification(n.title, n.body, n.data);
    }
  }
}
