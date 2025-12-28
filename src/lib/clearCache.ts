import { toast } from "sonner";

// Clear all IndexedDB databases
const clearIndexedDB = async (): Promise<void> => {
  try {
    // Get all database names if supported
    if ('indexedDB' in window && 'databases' in indexedDB) {
      const databases = await (indexedDB as any).databases();
      await Promise.all(
        databases.map((db: { name: string }) => 
          new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase(db.name);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            request.onblocked = () => resolve(); // Continue even if blocked
          })
        )
      );
    } else {
      // Fallback: try to delete known database names
      const knownDBs = ['app-cache', 'supabase-cache', 'workbox-precache', 'stories', 'posts', 'reels', 'profiles'];
      await Promise.all(
        knownDBs.map(dbName => 
          new Promise<void>((resolve) => {
            const request = indexedDB.deleteDatabase(dbName);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          })
        )
      );
    }
  } catch (error) {
    console.warn("IndexedDB clear warning:", error);
  }
};

export const clearAppCache = async () => {
  const loadingToast = toast.loading("Clearing cache...");
  
  try {
    // Clear service worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log(`Cleared ${cacheNames.length} cache storage entries`);
    }

    // Unregister service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => registration.unregister())
      );
      console.log(`Unregistered ${registrations.length} service workers`);
    }

    // Clear IndexedDB
    await clearIndexedDB();
    console.log("Cleared IndexedDB databases");

    // Clear localStorage (except theme preference and auth tokens for graceful reload)
    const theme = localStorage.getItem('theme');
    const authToken = localStorage.getItem('sb-cbfqwaqwliehgxsdueem-auth-token');
    localStorage.clear();
    if (theme) {
      localStorage.setItem('theme', theme);
    }
    if (authToken) {
      localStorage.setItem('sb-cbfqwaqwliehgxsdueem-auth-token', authToken);
    }
    console.log("Cleared localStorage");

    // Clear sessionStorage
    sessionStorage.clear();
    console.log("Cleared sessionStorage");

    toast.dismiss(loadingToast);
    toast.success("Cache cleared successfully! Reloading...");
    
    // Force hard reload after a short delay
    setTimeout(() => {
      // Add cache-busting parameter to force fresh load
      const url = new URL(window.location.href);
      url.searchParams.set('_cb', Date.now().toString());
      window.location.replace(url.toString());
    }, 800);
  } catch (error) {
    console.error("Error clearing cache:", error);
    toast.dismiss(loadingToast);
    toast.error("Failed to clear cache. Please try again.");
  }
};
