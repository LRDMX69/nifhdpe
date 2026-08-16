import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./components/ThemeProvider";
import { RootErrorBoundary } from "./components/RootErrorBoundary";
const App = lazy(() => import("./App.tsx"));
import "./index.css";
import { initPushNotifications } from "./lib/pushNotifications";

const rootEl = document.getElementById("root")!;

// A missing backend URL/key (e.g. env vars not set on the hosting provider)
// makes createClient throw at import time and the page renders blank. Show a
// readable message instead of a white screen.
const missingEnv = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (missingEnv) {
  rootEl.innerHTML = `
    <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#061829;color:#eef7f1;font-family:Inter,system-ui,sans-serif;padding:24px">
      <section style="width:min(100%,520px);border:1px solid rgba(105,212,106,.24);border-radius:18px;background:linear-gradient(145deg,rgba(17,43,62,.98),rgba(6,24,41,.98));box-shadow:0 24px 80px rgba(0,0,0,.32);overflow:hidden">
        <div style="height:6px;background:linear-gradient(90deg,#3faa44,#8be28c,#10306b)"></div>
        <div style="padding:32px">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
            <div style="width:42px;height:42px;border-radius:12px;background:#69d46a;color:#061829;display:grid;place-items:center;font-weight:800;letter-spacing:-.06em">NIF</div>
            <div><p style="margin:0;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#9ae19c;font-weight:700">Technical Company</p><p style="margin:4px 0 0;color:#b4c6d2;font-size:12px">Industrial Operations Suite</p></div>
          </div>
          <p style="margin:0 0 8px;color:#9ae19c;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700">Deployment status</p>
          <h1 style="font-size:26px;line-height:1.15;margin:0 0 12px;color:#ffffff;letter-spacing:-.03em">Backend configuration required</h1>
          <p style="max-width:420px;font-size:14px;line-height:1.65;color:#b4c6d2;margin:0">This build is healthy, but the Supabase connection is not configured for this environment. Add the required deployment variables and redeploy to enable authentication and operational data.</p>
          <div style="margin-top:22px;border:1px solid rgba(180,198,210,.14);border-radius:12px;background:rgba(0,0,0,.16);padding:14px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.8;color:#d6e8db"><div><span style="color:#9ae19c">Required:</span> VITE_SUPABASE_URL</div><div><span style="color:#9ae19c">Required:</span> VITE_SUPABASE_PUBLISHABLE_KEY</div></div>
          <p style="margin:18px 0 0;color:#7891a0;font-size:12px">No business data is displayed until the connection is available.</p>
        </div>
      </section>
    </main>`;
} else {
  createRoot(rootEl).render(
    <RootErrorBoundary>
      <ThemeProvider>
        <Suspense fallback={<main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#061829", color: "#eef7f1", fontFamily: "Inter, system-ui, sans-serif" }}>Loading application…</main>}>
          <App />
        </Suspense>
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
