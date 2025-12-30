/**
 * Performance boost initialization
 * This file contains critical performance optimizations that run on app startup
 * v5 - Aggressive cache invalidation
 */

// Preload critical resources on idle
export const initPerformanceBoost = () => {
  try {
    // CRITICAL: Clear stale caches immediately for dev/preview
    clearStaleCachesImmediately();
    
    // Prefetch DNS for external services
    prefetchDNS();

    // Enable HTTP/2 server push hints
    enableResourceHints();

    // Clean old cache in background (non-blocking)
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        cleanupOldCache();
      });
    } else {
      setTimeout(cleanupOldCache, 2000);
    }
  } catch (error) {
    console.error('Performance boost initialization failed:', error);
  }
};

// CRITICAL: Clear all stale caches immediately on load
const clearStaleCachesImmediately = async () => {
  const isDevOrPreview = import.meta.env.DEV || 
    window.location.hostname.includes('lovable') ||
    window.location.hostname.includes('localhost');
    
  if (!isDevOrPreview) return;
  
  try {
    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      if (registrations.length > 0) {
        console.log('[Cache] Unregistered', registrations.length, 'service workers');
      }
    }

    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      if (cacheNames.length > 0) {
        console.log('[Cache] Cleared', cacheNames.length, 'caches');
      }
    }
  } catch (e) {
    // Silent fail - non-critical
  }
};

// Cleanup cache older than 24 hours
const cleanupOldCache = () => {
  try {
    const lastCleanup = localStorage.getItem('lastCacheCleanup');
    const now = Date.now();
    
    if (!lastCleanup || now - parseInt(lastCleanup) > 24 * 60 * 60 * 1000) {
      // Clear localStorage cache markers
      localStorage.setItem('lastCacheCleanup', now.toString());
      console.log('✅ Cache cleanup markers updated');
    }
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
};

// Prefetch DNS for external services
const prefetchDNS = () => {
  const domains = [
    'https://cbfqwaqwliehgxsdueem.supabase.co',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ];

  domains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    document.head.appendChild(link);
  });
};

// Add resource hints for better loading
const enableResourceHints = () => {
  // Preconnect to Supabase
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = 'https://cbfqwaqwliehgxsdueem.supabase.co';
  preconnect.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect);
};

// Optimize images on-the-fly
export const optimizeImageLoading = () => {
  // Use Intersection Observer for lazy loading
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '100px', // Load images 100px before they enter viewport
      }
    );

    // Observe all images with data-src
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
};
