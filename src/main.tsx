import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./components/ThemeProvider";
import { RootErrorBoundary } from "./components/RootErrorBoundary";
import App from "./App.tsx";
import "./index.css";
import { initPushNotifications } from "./lib/pushNotifications";

const rootEl = document.getElementById("root")!;

// A missing backend URL/key (e.g. env vars not set on the hosting provider)
// makes createClient throw at import time and the page renders blank. Show a
// readable message instead of a white screen.
const missingEnv = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (missingEnv) {
  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:#061829;color:#e6edf3;font-family:system-ui,sans-serif;padding:24px;text-align:center">
      <h1 style="font-size:20px;margin:0">Backend configuration missing</h1>
      <p style="max-width:420px;font-size:14px;opacity:.8;margin:0">
        VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are not set for this deployment.
        Add them to the hosting environment variables and redeploy.
      </p>
    </div>`;
} else {
  createRoot(rootEl).render(
    <RootErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </RootErrorBoundary>
  );
}

// Guard: only register SW on published production host, never in preview iframes
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (!isPreviewHost && !isInIframe) {
  initPushNotifications().catch((err) => console.error("initPushNotifications failed", err));
} else {
  // Clean up any stale SW registrations in preview contexts
  navigator.serviceWorker?.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}
