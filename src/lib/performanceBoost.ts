/**
 * Performance boost initialization
 * This file contains critical performance optimizations that run on app startup
 */

import { connectionPool } from './connectionPool';
import { clearCache } from './indexedDBCache';

// Preload critical resources on idle
export const initPerformanceBoost = () => {
  // Clear old cache on app start (keep only fresh data)
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      cleanupOldCache();
    });
  } else {
    setTimeout(cleanupOldCache, 1000);
  }

  // Prefetch DNS for external services
  prefetchDNS();

  // Enable HTTP/2 server push hints
  enableResourceHints();
};

// Cleanup cache older than 24 hours
const cleanupOldCache = async () => {
  const lastCleanup = localStorage.getItem('lastCacheCleanup');
  const now = Date.now();
  
  if (!lastCleanup || now - parseInt(lastCleanup) > 24 * 60 * 60 * 1000) {
    try {
      // Clear old IndexedDB cache
      await Promise.all([
        clearCache('stories'),
        clearCache('posts'),
        clearCache('reels'),
      ]);
      localStorage.setItem('lastCacheCleanup', now.toString());
      console.log('✅ Cache cleanup complete');
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
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
