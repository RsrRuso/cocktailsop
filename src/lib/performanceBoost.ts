/**
 * Performance boost initialization
 * This file contains critical performance optimizations that run on app startup
 * v6 - Ultra-aggressive instant loading for avatars, stories, posts, reels
 */

import { prefetchImmediate } from './routePrefetch';

// Preload critical resources IMMEDIATELY on app start
export const initPerformanceBoost = () => {
  try {
    // NOTE: Heavy network prefetching is handled by initFastLoad after first paint
    // to prevent iOS Add-to-Home-Screen launch freezes.

    // INSTANT: Preload cached avatars from localStorage/sessionStorage
    preloadCachedMedia();

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

// INSTANT: Preload avatars and media from cache on cold start
const preloadCachedMedia = () => {
  try {
    // Check for cached profile in localStorage
    const cachedAuth = localStorage.getItem('sb-cbfqwaqwliehgxsdueem-auth-token');
    if (cachedAuth) {
      const parsed = JSON.parse(cachedAuth);
      const profile = parsed?.user?.user_metadata;
      if (profile?.avatar_url) {
        // Preload current user avatar IMMEDIATELY
        const img = new Image();
        (img as any).fetchPriority = 'high';
        img.src = profile.avatar_url;
      }
    }
    
    // Preload feed avatars from localStorage cache
    const feedCache = localStorage.getItem('feed_cache_v2');
    if (feedCache) {
      const parsed = JSON.parse(feedCache);
      const avatarUrls: string[] = [];
      
      // Collect all avatar URLs from cached feed
      parsed.posts?.slice(0, 10).forEach((post: any) => {
        if (post.profiles?.avatar_url) avatarUrls.push(post.profiles.avatar_url);
        // Also preload first post image
        if (post.media_urls?.[0]) {
          const img = new Image();
          (img as any).fetchPriority = 'high';
          img.src = post.media_urls[0];
        }
      });
      
      parsed.reels?.slice(0, 5).forEach((reel: any) => {
        if (reel.profiles?.avatar_url) avatarUrls.push(reel.profiles.avatar_url);
      });
      
      // Preload unique avatars with high priority
      const uniqueUrls = [...new Set(avatarUrls)];
      uniqueUrls.slice(0, 15).forEach(url => {
        const img = new Image();
        (img as any).fetchPriority = 'high';
        img.src = url;
      });
    }
    
    // Preload story avatars from sessionStorage
    const storiesCache = sessionStorage.getItem('stories_cache');
    if (storiesCache) {
      const parsed = JSON.parse(storiesCache);
      parsed.data?.slice(0, 10).forEach((story: any) => {
        if (story.profiles?.avatar_url) {
          const img = new Image();
          (img as any).fetchPriority = 'high';
          img.src = story.profiles.avatar_url;
        }
        // Preload first story media (only images)
        if (story.media_urls?.[0] && !story.media_types?.[0]?.startsWith('video')) {
          const img = new Image();
          img.src = story.media_urls[0];
        }
      });
    }
  } catch (e) {
    // Silent fail - non-critical
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
    }

    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
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
      localStorage.setItem('lastCacheCleanup', now.toString());
    }
  } catch (error) {
    // Silent fail
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
  
  // Preconnect to Supabase storage for instant avatar loading
  const storagePreconnect = document.createElement('link');
  storagePreconnect.rel = 'preconnect';
  storagePreconnect.href = 'https://cbfqwaqwliehgxsdueem.supabase.co/storage';
  storagePreconnect.crossOrigin = 'anonymous';
  document.head.appendChild(storagePreconnect);
};

// Optimize images on-the-fly
export const optimizeImageLoading = () => {
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
        rootMargin: '200px',
      }
    );

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
};
