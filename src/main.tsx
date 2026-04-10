import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./components/ThemeProvider";
import App from "./App.tsx";
import "./index.css";
import { initPushNotifications } from "./lib/pushNotifications";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

// Guard: only register SW on published production host, never in preview iframes
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (!isPreviewHost && !isInIframe) {
  initPushNotifications().catch(console.error);
} else {
  // Clean up any stale SW registrations in preview contexts
  navigator.serviceWorker?.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  });
}
