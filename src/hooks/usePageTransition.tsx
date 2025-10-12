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
      
      // Warn if slower than 5 seconds
      if (duration > 5000) {
        console.warn(`Slow page load: ${location.pathname} took ${(duration / 1000).toFixed(2)}s`);
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
