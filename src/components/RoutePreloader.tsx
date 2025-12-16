import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { prefetchProfile, prefetchHomeFeed } from '@/lib/routePrefetch';
import { prefetchStoriesData } from '@/hooks/useStoriesData';
import { prefetchMessagesData } from '@/hooks/useMessagesData';
import { prefetchNotificationsData } from '@/hooks/useNotificationsData';
import { useAuth } from '@/contexts/AuthContext';

export const RoutePreloader = () => {
  const location = useLocation();
  const { user } = useAuth();
  const prefetchedRoutes = useRef(new Set<string>());
  const hasPrefetchedCore = useRef(false);

  // Prefetch ALL core data immediately on mount for instant navigation
  useEffect(() => {
    if (!hasPrefetchedCore.current) {
      hasPrefetchedCore.current = true;
      const region = localStorage.getItem('selectedRegion');
      
      // Prefetch everything in parallel for instant loading
      Promise.all([
        prefetchHomeFeed(region),
        prefetchStoriesData(),
        user?.id ? prefetchMessagesData(user.id) : Promise.resolve(),
        user?.id ? prefetchNotificationsData(user.id) : Promise.resolve(),
      ]);
    }
  }, [user?.id]);

  const prefetchRoute = useCallback(async (path: string) => {
    if (prefetchedRoutes.current.has(path)) return;
    
    prefetchedRoutes.current.add(path);
    const region = localStorage.getItem('selectedRegion');
    
    if (path === '/home' || path === '/') {
      await Promise.all([prefetchHomeFeed(region), prefetchStoriesData()]);
    } else if (path === '/profile' && user?.id) {
      await prefetchProfile(user.id);
    } else if (path === '/messages' && user?.id) {
      await prefetchMessagesData(user.id);
    } else if (path === '/notifications' && user?.id) {
      await prefetchNotificationsData(user.id);
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
