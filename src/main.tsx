// App entry point - v5 (safe cache recovery)
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPerformanceBoost } from "./lib/performanceBoost";
import { initChunkLoadRecovery } from "./lib/chunkLoadRecovery";

// Recover from stale cached Vite chunks / Service Workers (prevents blank screen)
initChunkLoadRecovery();

// Initialize performance optimizations
initPerformanceBoost();

// Set initial theme from localStorage or default to black
const savedTheme = localStorage.getItem("theme") || "black";
// Remove any existing theme classes first, then add the saved theme
document.documentElement.classList.remove('light', 'dark', 'black', 'grey', 'ocean', 'sunset', 'forest', 'purple', 'neon', 'midnight', 'sakura', 'arctic', 'lava', 'mint', 'rosegold', 'cyber');
document.documentElement.classList.add(savedTheme);

// Mount the app (no StrictMode to avoid double-render + duplicate fetches in dev)
const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<App />);
}

