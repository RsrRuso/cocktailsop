import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/registerSW";
import { initPerformanceBoost } from "./lib/performanceBoost";

// Register service worker for offline caching
registerServiceWorker();

// Initialize performance optimizations
initPerformanceBoost();

// Set initial theme from localStorage or default to dark
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.classList.add(savedTheme);

// Providers are in App.tsx - no duplicate wrapping
createRoot(document.getElementById("root")!).render(<App />);
