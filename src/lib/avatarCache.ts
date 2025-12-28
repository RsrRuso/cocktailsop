// Global in-memory avatar cache for instant loading
const avatarBlobCache = new Map<string, string>();
const avatarLoadPromises = new Map<string, Promise<string>>();
const preloadedUrls = new Set<string>();
const loadedFromBrowser = new Set<string>();

// Cache key from URL - simplified for speed
const getCacheKey = (url: string): string => {
  if (!url) return '';
  return url;
};

// Mark avatar as loaded (called when browser loads it)
export const markAvatarLoaded = (url: string): void => {
  if (!url) return;
  const cacheKey = getCacheKey(url);
  loadedFromBrowser.add(cacheKey);
  preloadedUrls.add(cacheKey);
  avatarBlobCache.set(cacheKey, url);
};

// Preload a single avatar with priority
export const preloadAvatar = async (url: string): Promise<string> => {
  if (!url) return '';
  
  const cacheKey = getCacheKey(url);
  
  // Already loaded
  if (preloadedUrls.has(cacheKey) || loadedFromBrowser.has(cacheKey)) {
    return url;
  }
  
  // Return cached immediately
  if (avatarBlobCache.has(cacheKey)) {
    return avatarBlobCache.get(cacheKey)!;
  }
  
  // Return existing promise if already loading
  if (avatarLoadPromises.has(cacheKey)) {
    return avatarLoadPromises.get(cacheKey)!;
  }
  
  // Create new loading promise with high priority
  const loadPromise = new Promise<string>((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      avatarBlobCache.set(cacheKey, url);
      preloadedUrls.add(cacheKey);
      avatarLoadPromises.delete(cacheKey);
      resolve(url);
    };
    
    img.onerror = () => {
      avatarLoadPromises.delete(cacheKey);
      resolve(url);
    };
    
    // Set priority hints
    img.fetchPriority = 'high';
    img.decoding = 'sync';
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

// Check if avatar is preloaded - faster check
export const isAvatarPreloaded = (url: string): boolean => {
  if (!url) return false;
  const cacheKey = getCacheKey(url);
  return preloadedUrls.has(cacheKey) || loadedFromBrowser.has(cacheKey) || avatarBlobCache.has(cacheKey);
};

// Batch preload avatars with concurrency
export const preloadAvatars = async (urls: (string | null | undefined)[]): Promise<void> => {
  const validUrls = urls.filter((url): url is string => !!url && !isAvatarPreloaded(url));
  
  // Preload all at once for speed
  await Promise.all(validUrls.map(preloadAvatar));
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
  
  // Preload immediately
  preloadAvatars(urls).catch(() => {});
};

// Clear cache (for logout)
export const clearAvatarCache = (): void => {
  avatarBlobCache.clear();
  avatarLoadPromises.clear();
  preloadedUrls.clear();
  loadedFromBrowser.clear();
};

// Preload current user's avatar immediately on auth - highest priority
export const preloadCurrentUserAvatar = (avatarUrl: string | null, coverUrl?: string | null): void => {
  if (avatarUrl) {
    // Immediate synchronous preload for current user
    const img = new Image();
    img.fetchPriority = 'high';
    img.decoding = 'sync';
    img.onload = () => markAvatarLoaded(avatarUrl);
    img.src = avatarUrl;
    preloadAvatar(avatarUrl);
  }
  if (coverUrl) {
    preloadAvatar(coverUrl);
  }
};
