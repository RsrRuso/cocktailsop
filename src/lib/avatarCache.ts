// Global in-memory avatar cache for instant loading
const avatarBlobCache = new Map<string, string>();
const avatarLoadPromises = new Map<string, Promise<string>>();
const preloadedUrls = new Set<string>();

// Cache key from URL
const getCacheKey = (url: string): string => {
  if (!url) return '';
  // Use the path part of the URL as key (after the last /)
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search;
  } catch {
    return url;
  }
};

// Preload a single avatar and cache it as blob
export const preloadAvatar = async (url: string): Promise<string> => {
  if (!url) return '';
  
  const cacheKey = getCacheKey(url);
  
  // Return cached blob URL immediately
  if (avatarBlobCache.has(cacheKey)) {
    return avatarBlobCache.get(cacheKey)!;
  }
  
  // Return existing promise if already loading
  if (avatarLoadPromises.has(cacheKey)) {
    return avatarLoadPromises.get(cacheKey)!;
  }
  
  // Create new loading promise
  const loadPromise = new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Store original URL in cache (browser will cache the actual image)
      avatarBlobCache.set(cacheKey, url);
      preloadedUrls.add(cacheKey);
      avatarLoadPromises.delete(cacheKey);
      resolve(url);
    };
    
    img.onerror = () => {
      avatarLoadPromises.delete(cacheKey);
      resolve(url); // Return original URL on error
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

// Batch preload avatars
export const preloadAvatars = async (urls: (string | null | undefined)[]): Promise<void> => {
  const validUrls = urls.filter((url): url is string => !!url && !isAvatarPreloaded(url));
  
  // Preload in parallel, max 10 at a time
  const batchSize = 10;
  for (let i = 0; i < validUrls.length; i += batchSize) {
    const batch = validUrls.slice(i, i + batchSize);
    await Promise.all(batch.map(preloadAvatar));
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
