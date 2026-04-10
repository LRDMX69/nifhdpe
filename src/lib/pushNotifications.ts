/**
 * Web Push Notification System
 * Handles service worker registration, permission requests, and local notifications.
 * Falls back to storing notifications for display on next app open.
 */

let swRegistration: ServiceWorkerRegistration | null = null;

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
    console.log("SW registration skipped (preview/iframe context)");
    return false;
  }
  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js");
    console.log("SW registered:", swRegistration.scope);
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
  // Try service worker notification first (works in background)
  if (swRegistration) {
    try {
      await swRegistration.showNotification(title, {
        body,
        icon: "/placeholder.svg",
        badge: "/placeholder.svg",
        data,
      } as NotificationOptions);
      return true;
    } catch (e) {
      console.warn("SW notification failed, trying fallback:", e);
    }
  }

  // Fallback: basic Notification API
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/placeholder.svg" });
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
  if (registered) {
    const permission = await requestNotificationPermission();
    if (permission !== "granted") {
      console.log("Notification permission:", permission);
    }
  }

  // Show any stored offline notifications
  const stored = getStoredNotifications();
  for (const n of stored) {
    // Only show notifications from last 24 hours
    if (Date.now() - n.timestamp < 24 * 60 * 60 * 1000) {
      showNotification(n.title, n.body, n.data);
    }
  }
}
