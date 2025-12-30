// Aggressive cache management for instant updates
const CACHE_VERSION = Date.now().toString();
const CACHE_CLEAR_KEY = 'sv__cache_version';

export const clearAllCaches = async (): Promise<void> => {
  try {
    // Clear all browser caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('[CacheManager] Cleared all caches:', cacheNames);
    }

    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      console.log('[CacheManager] Unregistered all service workers');
    }

    // Clear IndexedDB caches
    const dbNames = ['sv-cache', 'stories', 'posts', 'reels', 'profiles'];
    for (const dbName of dbNames) {
      try {
        indexedDB.deleteDatabase(dbName);
      } catch {
        // Ignore errors
      }
    }

    // Clear sessionStorage except critical flags
    const theme = localStorage.getItem('theme');
    const criticalKeys = ['theme', 'supabase.auth.token'];
    const savedValues: Record<string, string | null> = {};
    
    criticalKeys.forEach(key => {
      savedValues[key] = localStorage.getItem(key);
    });

    // Clear localStorage
    localStorage.clear();
    
    // Restore critical values
    Object.entries(savedValues).forEach(([key, value]) => {
      if (value) localStorage.setItem(key, value);
    });

    // Clear sessionStorage
    sessionStorage.clear();

    console.log('[CacheManager] All caches cleared successfully');
  } catch (error) {
    console.error('[CacheManager] Error clearing caches:', error);
  }
};

export const checkAndClearStaleCache = async (): Promise<boolean> => {
  const storedVersion = localStorage.getItem(CACHE_CLEAR_KEY);
  
  // If version mismatch, clear everything
  if (storedVersion !== CACHE_VERSION) {
    console.log('[CacheManager] Version mismatch, clearing stale cache');
    await clearAllCaches();
    localStorage.setItem(CACHE_CLEAR_KEY, CACHE_VERSION);
    return true;
  }
  
  return false;
};

export const forceRefresh = async (): Promise<void> => {
  await clearAllCaches();
  
  // Force reload with cache bust
  const url = new URL(window.location.href);
  url.searchParams.set('_cb', Date.now().toString());
  window.location.replace(url.toString());
};

// Auto-check on module load
if (typeof window !== 'undefined') {
  checkAndClearStaleCache().then(cleared => {
    if (cleared) {
      console.log('[CacheManager] Stale cache was cleared on startup');
    }
  });
}
