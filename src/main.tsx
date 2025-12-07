import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPerformanceBoost } from "./lib/performanceBoost";

// Initialize performance optimizations
initPerformanceBoost();

// Set initial theme from localStorage or default to dark
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.classList.add(savedTheme);

// Mount the app
const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<App />);
}
