import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { prefetchProfile, prefetchHomeFeed } from '@/lib/routePrefetch';
import { useAuth } from '@/contexts/AuthContext';

export const RoutePreloader = () => {
  const location = useLocation();
  const { user } = useAuth();
  const prefetchedRoutes = useRef(new Set<string>());

  const prefetchRoute = useCallback(async (path: string) => {
    if (!user?.id || prefetchedRoutes.current.has(path)) return;
    
    prefetchedRoutes.current.add(path);
    const region = localStorage.getItem('selectedRegion');
    
    if (path === '/home') {
      await prefetchHomeFeed(region);
    } else if (path === '/profile') {
      await prefetchProfile(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    const timer = setTimeout(() => prefetchRoute(location.pathname), 50);
    return () => clearTimeout(timer);
  }, [location.pathname, prefetchRoute]);

  useEffect(() => {
    const handleMouseEnter = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement;
      if (link) prefetchRoute(link.getAttribute('href') || '');
    };

    document.addEventListener('mouseenter', handleMouseEnter, true);
    return () => document.removeEventListener('mouseenter', handleMouseEnter, true);
  }, [prefetchRoute]);

  return null;
};
