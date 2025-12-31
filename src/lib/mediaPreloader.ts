// Aggressive media preloading for instant reel and avatar display
const videoCache = new Map<string, HTMLVideoElement>();
const preloadQueue = new Set<string>();
const imageCache = new Map<string, HTMLImageElement>();
const MAX_CACHED_VIDEOS = 15;
const MAX_CACHED_IMAGES = 50;

// Connection quality monitoring with caching
let cachedConnectionQuality: 'fast' | 'slow' | 'offline' = 'fast';
let lastQualityCheck = 0;
const QUALITY_CHECK_INTERVAL = 5000; // 5 seconds

// Connection quality check with caching
export const getConnectionQuality = (): 'fast' | 'slow' | 'offline' => {
  const now = Date.now();
  if (now - lastQualityCheck < QUALITY_CHECK_INTERVAL) {
    return cachedConnectionQuality;
  }
  
  lastQualityCheck = now;
  
  if (!navigator.onLine) {
    cachedConnectionQuality = 'offline';
    return 'offline';
  }
  
  const conn = (navigator as any).connection;
  if (!conn) {
    cachedConnectionQuality = 'fast';
    return 'fast';
  }
  
  const { effectiveType, downlink, saveData } = conn;
  
  // Respect data saver mode
  if (saveData) {
    cachedConnectionQuality = 'slow';
    return 'slow';
  }
  
  // Slow connection: 2G, 3G, or downlink < 2 Mbps
  if (effectiveType === '2g' || effectiveType === 'slow-2g' || effectiveType === '3g' || downlink < 2) {
    cachedConnectionQuality = 'slow';
    return 'slow';
  }
  
  cachedConnectionQuality = 'fast';
  return 'fast';
};

// Preload video and cache the element
export const preloadVideo = (url: string, priority: 'high' | 'low' = 'low'): Promise<void> => {
  if (!url || videoCache.has(url) || preloadQueue.has(url)) {
    return Promise.resolve();
  }

  // Skip preloading on slow connections unless high priority
  const quality = getConnectionQuality();
  if (quality === 'offline') return Promise.resolve();
  if (quality === 'slow' && priority === 'low') return Promise.resolve();

  preloadQueue.add(url);

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = quality === 'slow' ? 'metadata' : 'auto';
    video.muted = true;
    video.playsInline = true;
    
    // Set fetch priority for critical videos
    if (priority === 'high') {
      (video as any).fetchPriority = 'high';
    }

    const cleanup = () => {
      preloadQueue.delete(url);
      resolve();
    };

    // Timeout for slow connections
    const timeout = setTimeout(cleanup, quality === 'slow' ? 5000 : 15000);

    video.onloadeddata = () => {
      clearTimeout(timeout);
      // Evict oldest if cache full
      if (videoCache.size >= MAX_CACHED_VIDEOS) {
        const firstKey = videoCache.keys().next().value;
        if (firstKey) videoCache.delete(firstKey);
      }
      videoCache.set(url, video);
      cleanup();
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
    };
    
    // Start loading
    video.src = url;
    video.load();
  });
};

// Get cached video element
export const getCachedVideo = (url: string): HTMLVideoElement | null => {
  return videoCache.get(url) || null;
};

// Preload image with caching
export const preloadImage = (url: string, priority: 'high' | 'low' = 'low'): Promise<void> => {
  if (!url || imageCache.has(url)) {
    return Promise.resolve();
  }

  const quality = getConnectionQuality();
  if (quality === 'offline') return Promise.resolve();

  return new Promise((resolve) => {
    const img = new Image();
    
    if (priority === 'high') {
      (img as any).fetchPriority = 'high';
      img.loading = 'eager';
    } else {
      img.loading = 'lazy';
    }

    const cleanup = () => resolve();
    const timeout = setTimeout(cleanup, quality === 'slow' ? 3000 : 8000);

    img.onload = () => {
      clearTimeout(timeout);
      if (imageCache.size >= MAX_CACHED_IMAGES) {
        const firstKey = imageCache.keys().next().value;
        if (firstKey) imageCache.delete(firstKey);
      }
      imageCache.set(url, img);
      cleanup();
    };

    img.onerror = () => {
      clearTimeout(timeout);
      cleanup();
    };

    img.src = url;
  });
};

// Preload multiple videos with priorities - connection-aware
export const preloadVideos = async (urls: string[], startIndex: number = 0) => {
  const quality = getConnectionQuality();
  
  // Adjust batch sizes based on connection
  const highPriorityCount = quality === 'slow' ? 1 : 3;
  const lowPriorityCount = quality === 'slow' ? 0 : 3;
  
  const highPriority = urls.slice(startIndex, startIndex + highPriorityCount);
  const lowPriority = urls.slice(startIndex + highPriorityCount, startIndex + highPriorityCount + lowPriorityCount);

  // Load high priority in parallel first
  await Promise.all(highPriority.map(url => preloadVideo(url, 'high')));
  
  // Then load low priority in background (only on good connections)
  if (quality === 'fast') {
    lowPriority.forEach(url => preloadVideo(url, 'low'));
  }
};

// Preload reel videos from feed data - connection-aware
export const preloadReelVideos = (reels: any[], currentIndex: number = 0) => {
  const videoUrls = reels
    .filter(r => r.video_url && !r.is_image_reel)
    .map(r => r.video_url);
  
  preloadVideos(videoUrls, currentIndex);
  
  // Also preload avatars
  const avatarUrls = reels
    .filter(r => r.profiles?.avatar_url)
    .map(r => r.profiles.avatar_url);
  
  avatarUrls.forEach((url, i) => {
    preloadImage(url, i < 3 ? 'high' : 'low');
  });
};

// Clear old cached videos to free memory
export const clearVideoCache = () => {
  videoCache.clear();
  preloadQueue.clear();
  imageCache.clear();
};

// Adaptive quality settings based on connection
export const getVideoPreloadStrategy = (): 'auto' | 'metadata' | 'none' => {
  const quality = getConnectionQuality();
  switch (quality) {
    case 'offline': return 'none';
    case 'slow': return 'metadata';
    default: return 'auto';
  }
};

// Check if we should show low-quality placeholders
export const shouldUseLowQuality = (): boolean => {
  return getConnectionQuality() === 'slow';
};

// Listen for connection changes
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    cachedConnectionQuality = 'fast';
    lastQualityCheck = 0;
  });
  
  window.addEventListener('offline', () => {
    cachedConnectionQuality = 'offline';
    lastQualityCheck = Date.now();
  });
  
  const conn = (navigator as any).connection;
  if (conn) {
    conn.addEventListener('change', () => {
      lastQualityCheck = 0; // Force recheck
    });
  }
}
