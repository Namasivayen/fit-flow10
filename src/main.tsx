import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register push service worker (production only, outside iframes)
const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
const isPreview = window.location.hostname.includes("id-preview--") || window.location.hostname.includes("lovableproject.com");

if (!isInIframe && !isPreview && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw-push.js").catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
