/**
 * Advanced Video Preload Queue
 * Instagram-style aggressive video preloading for instant playback
 */

interface PreloadItem {
  url: string;
  priority: number;
  video?: HTMLVideoElement;
  loaded: boolean;
}

class VideoPreloadQueue {
  private queue: Map<string, PreloadItem> = new Map();
  private loading: Set<string> = new Set();
  private maxConcurrent = 3;
  private maxCached = 10;
  
  // Preload video with priority (higher = more important)
  preload(url: string, priority: number = 0) {
    if (!url || this.queue.has(url)) return;
    
    const item: PreloadItem = { url, priority, loaded: false };
    this.queue.set(url, item);
    
    this.processQueue();
  }
  
  // Preload multiple videos with decreasing priority
  preloadBatch(urls: string[], startPriority: number = 10) {
    urls.forEach((url, index) => {
      if (url) {
        this.preload(url, startPriority - index);
      }
    });
  }
  
  // Get preloaded video element
  getVideo(url: string): HTMLVideoElement | null {
    const item = this.queue.get(url);
    if (item?.video && item.loaded) {
      return item.video;
    }
    return null;
  }
  
  // Check if video is preloaded
  isPreloaded(url: string): boolean {
    return this.queue.get(url)?.loaded ?? false;
  }
  
  private processQueue() {
    if (this.loading.size >= this.maxConcurrent) return;
    
    // Sort by priority and get next item
    const pending = Array.from(this.queue.values())
      .filter(item => !item.loaded && !this.loading.has(item.url))
      .sort((a, b) => b.priority - a.priority);
    
    const next = pending[0];
    if (!next) return;
    
    this.loading.add(next.url);
    this.loadVideo(next);
  }
  
  private loadVideo(item: PreloadItem) {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    
    // Use crossOrigin for CORS
    video.crossOrigin = 'anonymous';
    
    video.onloadeddata = () => {
      item.video = video;
      item.loaded = true;
      this.loading.delete(item.url);
      this.cleanupOldVideos();
      this.processQueue();
    };
    
    video.onerror = () => {
      this.loading.delete(item.url);
      this.queue.delete(item.url);
      this.processQueue();
    };
    
    // Start loading
    video.src = item.url;
    video.load();
  }
  
  private cleanupOldVideos() {
    if (this.queue.size <= this.maxCached) return;
    
    // Remove lowest priority loaded videos
    const loaded = Array.from(this.queue.entries())
      .filter(([, item]) => item.loaded)
      .sort((a, b) => a[1].priority - b[1].priority);
    
    while (this.queue.size > this.maxCached && loaded.length > 0) {
      const [url, item] = loaded.shift()!;
      if (item.video) {
        item.video.src = '';
        item.video.load();
      }
      this.queue.delete(url);
    }
  }
  
  // Clear all cached videos
  clear() {
    this.queue.forEach(item => {
      if (item.video) {
        item.video.src = '';
        item.video.load();
      }
    });
    this.queue.clear();
    this.loading.clear();
  }
}

// Singleton instance
export const videoPreloadQueue = new VideoPreloadQueue();

// Convenience functions
export const preloadVideo = (url: string, priority: number = 0) => {
  videoPreloadQueue.preload(url, priority);
};

export const preloadVideos = (urls: string[], startPriority: number = 10) => {
  videoPreloadQueue.preloadBatch(urls, startPriority);
};

export const getPreloadedVideo = (url: string) => {
  return videoPreloadQueue.getVideo(url);
};

export const isVideoPreloaded = (url: string) => {
  return videoPreloadQueue.isPreloaded(url);
};

// Preload videos around current index (Instagram-style)
export const preloadAroundIndex = (
  videos: { url: string }[],
  currentIndex: number,
  range: number = 3
) => {
  const urls: string[] = [];
  
  // Current video highest priority
  if (videos[currentIndex]?.url) {
    urls.push(videos[currentIndex].url);
  }
  
  // Next videos
  for (let i = 1; i <= range; i++) {
    const nextIndex = currentIndex + i;
    if (videos[nextIndex]?.url) {
      urls.push(videos[nextIndex].url);
    }
  }
  
  // Previous videos (lower priority)
  for (let i = 1; i <= Math.min(range, 2); i++) {
    const prevIndex = currentIndex - i;
    if (prevIndex >= 0 && videos[prevIndex]?.url) {
      urls.push(videos[prevIndex].url);
    }
  }
  
  preloadVideos(urls, 10);
};
