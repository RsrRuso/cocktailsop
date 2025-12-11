import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { prefetchProfile, prefetchHomeFeed } from '@/lib/routePrefetch';
import { useAuth } from '@/contexts/AuthContext';

export const RoutePreloader = () => {
  const location = useLocation();
  const { user } = useAuth();
  const prefetchedRoutes = useRef(new Set<string>());
  const hasPrefetchedHome = useRef(false);

  // Prefetch home feed immediately on mount for instant navigation
  useEffect(() => {
    if (!hasPrefetchedHome.current) {
      hasPrefetchedHome.current = true;
      const region = localStorage.getItem('selectedRegion');
      // Start prefetching home feed immediately
      prefetchHomeFeed(region);
    }
  }, []);

  const prefetchRoute = useCallback(async (path: string) => {
    if (prefetchedRoutes.current.has(path)) return;
    
    prefetchedRoutes.current.add(path);
    const region = localStorage.getItem('selectedRegion');
    
    if (path === '/home' || path === '/') {
      await prefetchHomeFeed(region);
    } else if (path === '/profile' && user?.id) {
      await prefetchProfile(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    // Prefetch current route immediately
    prefetchRoute(location.pathname);
  }, [location.pathname, prefetchRoute]);

  useEffect(() => {
    const handleMouseEnter = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return;
      
      const link = e.target.closest('a[href]') as HTMLAnchorElement;
      if (link) prefetchRoute(link.getAttribute('href') || '');
    };

    document.addEventListener('mouseenter', handleMouseEnter, true);
    return () => document.removeEventListener('mouseenter', handleMouseEnter, true);
  }, [prefetchRoute]);

  return null;
};
