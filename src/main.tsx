import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force SW update on every app load
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistration("/sw.js").then((reg) => {
    if (reg) reg.update().catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);
