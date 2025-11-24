import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Track page transition performance
export const usePageTransition = () => {
  const location = useLocation();

  useEffect(() => {
    const startTime = performance.now();
    
    // Mark when page becomes interactive
    const handleLoad = () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Log all page transitions for monitoring
      console.log(`⚡ Page transition: ${location.pathname} - ${(duration / 1000).toFixed(2)}s`);
      
      // Warn if slower than 1 second (Instagram-level target)
      if (duration > 1000) {
        console.warn(`⚠️ Slow page load: ${location.pathname} took ${(duration / 1000).toFixed(2)}s (target: <1s)`);
      } else {
        console.log(`✅ Fast load: ${location.pathname}`);
      }
    };

    // Wait for page to be fully loaded
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, [location.pathname]);
};
