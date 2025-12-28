import { toast } from "sonner";

// Force delete all IndexedDB databases immediately
const clearIndexedDB = async (): Promise<void> => {
  try {
    if ('indexedDB' in window) {
      // Get all database names if supported
      if ('databases' in indexedDB) {
        const databases = await (indexedDB as any).databases();
        console.log(`Found ${databases.length} IndexedDB databases to delete`);
        
        for (const db of databases) {
          try {
            const request = indexedDB.deleteDatabase(db.name);
            request.onsuccess = () => console.log(`Deleted IndexedDB: ${db.name}`);
            request.onerror = () => console.warn(`Failed to delete IndexedDB: ${db.name}`);
            request.onblocked = () => {
              console.warn(`IndexedDB blocked: ${db.name}, forcing close`);
            };
          } catch (e) {
            console.warn(`Error deleting ${db.name}:`, e);
          }
        }
      }
      
      // Also try known database names as fallback
      const knownDBs = [
        'app-cache', 'supabase-cache', 'workbox-precache', 
        'stories', 'posts', 'reels', 'profiles', 'keyval-store',
        'firebaseLocalStorageDb', 'localforage', 'idb-keyval'
      ];
      
      for (const dbName of knownDBs) {
        try {
          indexedDB.deleteDatabase(dbName);
        } catch (e) {
          // Ignore errors for known DBs
        }
      }
    }
  } catch (error) {
    console.warn("IndexedDB clear warning:", error);
  }
};

// Clear all browser caches aggressively
const clearAllCaches = async (): Promise<number> => {
  let count = 0;
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      console.log(`Found ${cacheNames.length} cache storage entries`);
      await Promise.all(
        cacheNames.map(async (cacheName) => {
          await caches.delete(cacheName);
          count++;
          console.log(`Deleted cache: ${cacheName}`);
        })
      );
    } catch (e) {
      console.warn("Cache clear error:", e);
    }
  }
  return count;
};

// Unregister all service workers immediately
const unregisterServiceWorkers = async (): Promise<number> => {
  let count = 0;
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`Found ${registrations.length} service workers`);
      
      for (const registration of registrations) {
        const success = await registration.unregister();
        if (success) {
          count++;
          console.log(`Unregistered service worker: ${registration.scope}`);
        }
      }
    } catch (e) {
      console.warn("Service worker unregister error:", e);
    }
  }
  return count;
};

export const clearAppCache = async () => {
  // Show brief toast and immediately reload - don't wait for async operations
  toast.success("Clearing cache...");
  
  // Clear localStorage quickly (preserve auth)
  const keysToRemove = Object.keys(localStorage).filter(
    key => key !== 'theme' && !key.startsWith('sb-')
  );
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Start background clearing (don't await)
  Promise.all([
    clearAllCaches(),
    unregisterServiceWorkers(),
    clearIndexedDB()
  ]).catch(() => {});
  
  // Immediately reload with cache bust - no delay
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('_nocache', Date.now().toString());
  window.location.replace(url.toString());
};
