import { useEffect } from 'react';

// Track page transition performance (safe even without Router context)
export const usePageTransition = () => {
  useEffect(() => {
    const startTime = performance.now();

    const handleLoad = () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      const path = window.location?.pathname || '/';

      // Production: only log slow page loads (>1s) to reduce console noise
      if (duration > 1000) {
        console.warn(`⚠️ Slow page load: ${path} took ${(duration / 1000).toFixed(2)}s (target: <1s)`);
      }
    };

    // Wait for page to be fully loaded
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);
};
