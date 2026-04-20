import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force SW update on every app load
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistration("/sw.js").then((reg) => {
    if (reg) reg.update().catch(() => {});
  });
}

// Auto-recover from stale chunk references after deploys/HMR rebuilds.
// When a lazy-loaded route fails to fetch (old hash no longer exists),
// reload once to grab the fresh manifest.
const RELOAD_FLAG = "__chunk_reload_attempted__";
function isChunkLoadError(message: string) {
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("error loading dynamically imported module")
  );
}
window.addEventListener("error", (event) => {
  if (event.message && isChunkLoadError(event.message) && !sessionStorage.getItem(RELOAD_FLAG)) {
    sessionStorage.setItem(RELOAD_FLAG, "1");
    window.location.reload();
  }
});
window.addEventListener("unhandledrejection", (event) => {
  const msg = (event.reason as { message?: string })?.message || String(event.reason || "");
  if (isChunkLoadError(msg) && !sessionStorage.getItem(RELOAD_FLAG)) {
    sessionStorage.setItem(RELOAD_FLAG, "1");
    window.location.reload();
  }
});
// Clear the flag once the app boots successfully
window.addEventListener("load", () => {
  setTimeout(() => sessionStorage.removeItem(RELOAD_FLAG), 2000);
});

createRoot(document.getElementById("root")!).render(<App />);
