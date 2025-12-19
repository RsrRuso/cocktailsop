/**
 * Fast Load Optimization System
 * Aggressive caching, preloading, and performance optimizations
 */

// Preload critical routes on app start
const criticalRoutes = ['/home', '/profile', '/explore', '/messages'];

export const preloadCriticalRoutes = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      criticalRoutes.forEach(route => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = route;
        document.head.appendChild(link);
      });
    });
  }
};

// Memory cache for instant data access
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const MEMORY_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export const setMemoryCache = (key: string, data: any) => {
  memoryCache.set(key, { data, timestamp: Date.now() });
};

export const getMemoryCache = <T>(key: string): T | null => {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > MEMORY_CACHE_TTL) {
    memoryCache.delete(key);
    return null;
  }
  
  return cached.data as T;
};

// Prefetch images for faster display
export const prefetchImages = (urls: string[]) => {
  urls.forEach(url => {
    if (!url) return;
    const img = new Image();
    img.src = url;
  });
};

// Connection-aware loading
export const getConnectionQuality = (): 'fast' | 'slow' | 'offline' => {
  if (!navigator.onLine) return 'offline';
  
  const connection = (navigator as any).connection;
  if (!connection) return 'fast';
  
  const { effectiveType, saveData } = connection;
  
  if (saveData) return 'slow';
  if (effectiveType === '4g') return 'fast';
  if (effectiveType === '3g' || effectiveType === '2g' || effectiveType === 'slow-2g') return 'slow';
  
  return 'fast';
};

// Batch DOM reads/writes for better performance
let scheduledReads: (() => void)[] = [];
let scheduledWrites: (() => void)[] = [];
let isScheduled = false;

const flush = () => {
  scheduledReads.forEach(fn => fn());
  scheduledReads = [];
  scheduledWrites.forEach(fn => fn());
  scheduledWrites = [];
  isScheduled = false;
};

export const scheduleRead = (fn: () => void) => {
  scheduledReads.push(fn);
  if (!isScheduled) {
    isScheduled = true;
    requestAnimationFrame(flush);
  }
};

export const scheduleWrite = (fn: () => void) => {
  scheduledWrites.push(fn);
  if (!isScheduled) {
    isScheduled = true;
    requestAnimationFrame(flush);
  }
};

// Debounce utility for scroll handlers
export const debounce = <T extends (...args: any[]) => void>(fn: T, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// Throttle utility for frequent events
export const throttle = <T extends (...args: any[]) => void>(fn: T, limit: number) => {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Initialize performance optimizations
export const initFastLoad = () => {
  // Add resource hints immediately
  const hints = [
    { rel: 'preconnect', href: 'https://cbfqwaqwliehgxsdueem.supabase.co' },
    { rel: 'dns-prefetch', href: 'https://fonts.googleapis.com' },
    { rel: 'dns-prefetch', href: 'https://fonts.gstatic.com' },
  ];
  
  hints.forEach(({ rel, href }) => {
    if (!document.querySelector(`link[rel="${rel}"][href="${href}"]`)) {
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      if (rel === 'preconnect') link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
  });
  
  // IMMEDIATE prefetch - don't wait for idle
  import('@/lib/routePrefetch').then(({ prefetchImmediate }) => {
    prefetchImmediate();
  });
  
  // Full prefetch after page loads
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      import('@/lib/routePrefetch').then(({ prefetchAllCritical }) => {
        prefetchAllCritical();
      });
    });
  } else {
    setTimeout(() => {
      import('@/lib/routePrefetch').then(({ prefetchAllCritical }) => {
        prefetchAllCritical();
      });
    }, 500); // Reduced from 1000ms
  }
  
  // Preload critical routes
  preloadCriticalRoutes();
  
  console.log('⚡ Fast load optimizations initialized');
};
