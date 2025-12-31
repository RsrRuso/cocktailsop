// Global in-memory avatar cache for instant loading with low-connection resilience
const avatarBlobCache = new Map<string, string>();
const avatarLoadPromises = new Map<string, Promise<string>>();
const preloadedUrls = new Set<string>();
const failedUrls = new Set<string>();

// IndexedDB for persistent avatar caching
const DB_NAME = 'avatar_cache_db';
const STORE_NAME = 'avatars';
let db: IDBDatabase | null = null;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
};

// Cache key from URL
const getCacheKey = (url: string): string => {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search;
  } catch {
    return url;
  }
};

// Store avatar in IndexedDB for offline access
const storeInDB = async (key: string, url: string): Promise<void> => {
  try {
    const database = await initDB();
    const tx = database.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ key, url, timestamp: Date.now() });
  } catch {}
};

// Get avatar from IndexedDB
const getFromDB = async (key: string): Promise<string | null> => {
  try {
    const database = await initDB();
    return new Promise((resolve) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result?.url || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

// Preload a single avatar with timeout and retry logic
export const preloadAvatar = async (url: string, retryCount = 0): Promise<string> => {
  if (!url) return '';
  
  const cacheKey = getCacheKey(url);
  
  // Return cached blob URL immediately
  if (avatarBlobCache.has(cacheKey)) {
    return avatarBlobCache.get(cacheKey)!;
  }
  
  // Skip if previously failed and not retrying
  if (failedUrls.has(cacheKey) && retryCount === 0) {
    return url;
  }
  
  // Return existing promise if already loading
  if (avatarLoadPromises.has(cacheKey)) {
    return avatarLoadPromises.get(cacheKey)!;
  }
  
  // Check IndexedDB for offline cached version
  if (!navigator.onLine) {
    const dbUrl = await getFromDB(cacheKey);
    if (dbUrl) {
      avatarBlobCache.set(cacheKey, dbUrl);
      return dbUrl;
    }
    return url;
  }
  
  // Create new loading promise with timeout
  const loadPromise = new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // Timeout for slow connections
    const timeout = setTimeout(() => {
      avatarLoadPromises.delete(cacheKey);
      resolve(url);
    }, 5000);
    
    img.onload = () => {
      clearTimeout(timeout);
      avatarBlobCache.set(cacheKey, url);
      preloadedUrls.add(cacheKey);
      failedUrls.delete(cacheKey);
      avatarLoadPromises.delete(cacheKey);
      
      // Store in IndexedDB for offline access
      storeInDB(cacheKey, url);
      
      resolve(url);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      avatarLoadPromises.delete(cacheKey);
      
      // Retry once on failure
      if (retryCount < 1) {
        setTimeout(() => preloadAvatar(url, retryCount + 1), 1000);
      } else {
        failedUrls.add(cacheKey);
      }
      
      resolve(url);
    };
    
    img.src = url;
  });
  
  avatarLoadPromises.set(cacheKey, loadPromise);
  return loadPromise;
};

// Get cached avatar URL (returns immediately if cached)
export const getCachedAvatar = (url: string): string | null => {
  if (!url) return null;
  const cacheKey = getCacheKey(url);
  return avatarBlobCache.get(cacheKey) || null;
};

// Check if avatar is preloaded
export const isAvatarPreloaded = (url: string): boolean => {
  if (!url) return false;
  return preloadedUrls.has(getCacheKey(url));
};

// Batch preload avatars - connection-aware
export const preloadAvatars = async (urls: (string | null | undefined)[]): Promise<void> => {
  const validUrls = urls.filter((url): url is string => !!url && !isAvatarPreloaded(url));
  
  // Adjust batch size based on connection
  const isSlowConnection = !navigator.onLine || 
    ((navigator as any).connection?.effectiveType === '2g') ||
    ((navigator as any).connection?.effectiveType === 'slow-2g');
  
  const batchSize = isSlowConnection ? 3 : 10;
  
  for (let i = 0; i < validUrls.length; i += batchSize) {
    const batch = validUrls.slice(i, i + batchSize);
    await Promise.all(batch.map(url => preloadAvatar(url)));
    
    // Small delay between batches on slow connections
    if (isSlowConnection && i + batchSize < validUrls.length) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
};

// Preload avatar URLs from feed data
export const preloadFeedAvatars = (items: any[]): void => {
  const urls: string[] = [];
  
  items.forEach(item => {
    if (item.profiles?.avatar_url) {
      urls.push(item.profiles.avatar_url);
    }
    if (item.avatar_url) {
      urls.push(item.avatar_url);
    }
  });
  
  // Preload in background without blocking
  preloadAvatars(urls).catch(() => {});
};

// Clear cache (for logout)
export const clearAvatarCache = (): void => {
  avatarBlobCache.forEach((blobUrl) => {
    if (blobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(blobUrl);
    }
  });
  avatarBlobCache.clear();
  avatarLoadPromises.clear();
  preloadedUrls.clear();
  failedUrls.clear();
};

// Preload current user's avatar immediately on auth
export const preloadCurrentUserAvatar = (avatarUrl: string | null, coverUrl?: string | null): void => {
  if (avatarUrl) {
    preloadAvatar(avatarUrl);
  }
  if (coverUrl) {
    preloadAvatar(coverUrl);
  }
};

// Initialize DB on module load
if (typeof window !== 'undefined') {
  initDB().catch(() => {});
}
