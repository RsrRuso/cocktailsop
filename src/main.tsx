// App entry point - v5 force cache clear
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPerformanceBoost } from "./lib/performanceBoost";
import "./lib/cacheManager"; // Auto-runs cache check on import

// Clear any stale service workers immediately
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => registration.unregister());
  });
}

// Clear all caches on load for dev/preview
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => caches.delete(name));
  });
}

// Initialize performance optimizations
initPerformanceBoost();

// Set initial theme from localStorage or default to black
const savedTheme = localStorage.getItem('theme') || 'black';
document.documentElement.classList.add(savedTheme);

// Mount the app
const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
