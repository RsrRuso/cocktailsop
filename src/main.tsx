// App entry point - v3 force cache clear
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPerformanceBoost } from "./lib/performanceBoost";

// Initialize performance optimizations
initPerformanceBoost();

// Set initial theme from localStorage or default to black
const savedTheme = localStorage.getItem('theme') || 'black';
document.documentElement.classList.add(savedTheme);

// Mount the app
const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<App />);
}