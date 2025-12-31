// Aggressive media preloading for instant reel and avatar display
const videoCache = new Map<string, HTMLVideoElement>();
const preloadQueue = new Set<string>();
const MAX_CACHED_VIDEOS = 10;

// Preload video and cache the element
export const preloadVideo = (url: string, priority: 'high' | 'low' = 'low'): Promise<void> => {
  if (!url || videoCache.has(url) || preloadQueue.has(url)) {
    return Promise.resolve();
  }

  preloadQueue.add(url);

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
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

    video.onloadeddata = () => {
      // Evict oldest if cache full
      if (videoCache.size >= MAX_CACHED_VIDEOS) {
        const firstKey = videoCache.keys().next().value;
        if (firstKey) videoCache.delete(firstKey);
      }
      videoCache.set(url, video);
      cleanup();
    };

    video.onerror = cleanup;
    
    // Start loading
    video.src = url;
    video.load();
  });
};

// Get cached video element
export const getCachedVideo = (url: string): HTMLVideoElement | null => {
  return videoCache.get(url) || null;
};

// Preload multiple videos with priorities
export const preloadVideos = async (urls: string[], startIndex: number = 0) => {
  // Preload current and next 2 videos with high priority
  const highPriority = urls.slice(startIndex, startIndex + 3);
  const lowPriority = urls.slice(startIndex + 3, startIndex + 6);

  // Load high priority in parallel first
  await Promise.all(highPriority.map(url => preloadVideo(url, 'high')));
  
  // Then load low priority in background
  lowPriority.forEach(url => preloadVideo(url, 'low'));
};

// Preload reel videos from feed data
export const preloadReelVideos = (reels: any[], currentIndex: number = 0) => {
  const videoUrls = reels
    .filter(r => r.video_url && !r.is_image_reel)
    .map(r => r.video_url);
  
  preloadVideos(videoUrls, currentIndex);
};

// Clear old cached videos to free memory
export const clearVideoCache = () => {
  videoCache.clear();
  preloadQueue.clear();
};

// Connection quality check
export const getConnectionQuality = (): 'fast' | 'slow' | 'offline' => {
  if (!navigator.onLine) return 'offline';
  
  const conn = (navigator as any).connection;
  if (!conn) return 'fast';
  
  const { effectiveType, downlink } = conn;
  
  // Slow connection: 2G or downlink < 1.5 Mbps
  if (effectiveType === '2g' || effectiveType === 'slow-2g' || downlink < 1.5) {
    return 'slow';
  }
  
  return 'fast';
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
