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

// Optimistic navigation - prepare next page before click completes
export const prefetchOnHover = (routePath: string, prefetchFn: () => Promise<void>) => {
  let prefetched = false;
  return {
    onMouseEnter: () => {
      if (!prefetched && getConnectionQuality() === 'fast') {
        prefetched = true;
        prefetchFn().catch(() => {});
      }
    },
    onTouchStart: () => {
      if (!prefetched) {
        prefetched = true;
        prefetchFn().catch(() => {});
      }
    }
  };
};

// Intersection Observer for lazy loading with prefetch
const observerCallbacks = new Map<Element, () => void>();
let intersectionObserver: IntersectionObserver | null = null;

const getObserver = () => {
  if (!intersectionObserver) {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const callback = observerCallbacks.get(entry.target);
            if (callback) {
              callback();
              observerCallbacks.delete(entry.target);
              intersectionObserver?.unobserve(entry.target);
            }
          }
        });
      },
      { rootMargin: '200px' } // Prefetch when 200px away from viewport
    );
  }
  return intersectionObserver;
};

export const observeForPrefetch = (element: Element, callback: () => void) => {
  observerCallbacks.set(element, callback);
  getObserver().observe(element);
  
  return () => {
    observerCallbacks.delete(element);
    getObserver().unobserve(element);
  };
};

// Initialize performance optimizations
export const initFastLoad = async () => {
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
  
  // Use static imports for route prefetch - avoids Vite dynamic import warnings
  // The actual prefetching is handled by RoutePreloader component
  
  // Preload critical routes
  preloadCriticalRoutes();
};
