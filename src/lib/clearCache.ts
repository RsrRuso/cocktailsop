import { toast } from "sonner";

export const clearAppCache = async () => {
  try {
    // Clear service worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }

    // Unregister service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => registration.unregister())
      );
    }

    // Clear localStorage (except theme preference)
    const theme = localStorage.getItem('theme');
    localStorage.clear();
    if (theme) {
      localStorage.setItem('theme', theme);
    }

    // Clear sessionStorage
    sessionStorage.clear();

    toast.success("Cache cleared! Reloading app...");
    
    // Reload the page after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    console.error("Error clearing cache:", error);
    toast.error("Failed to clear cache");
  }
};
