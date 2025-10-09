import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import App from "./App.tsx";
import "./index.css";

// Set initial theme from localStorage or default to dark
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.classList.add(savedTheme);

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
