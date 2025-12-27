import { useEffect, useCallback, useRef, useState } from 'react';
import { prefetchStoriesData } from '@/hooks/useStoriesData';
import { prefetchMessagesData } from '@/hooks/useMessagesData';
import { prefetchNotificationsData } from '@/hooks/useNotificationsData';
import { useAuth } from '@/contexts/AuthContext';

export const RoutePreloader = () => {
  const { user } = useAuth();
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const prefetchedRoutes = useRef(new Set<string>());
  const hasPrefetchedCore = useRef(false);

  // Track pathname changes without useLocation
  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    // Also observe pushState/replaceState
    const originalPush = history.pushState.bind(history);
    const originalReplace = history.replaceState.bind(history);
    history.pushState = (...args) => {
      originalPush(...args);
      setPathname(window.location.pathname);
    };
    history.replaceState = (...args) => {
      originalReplace(...args);
      setPathname(window.location.pathname);
    };

    return () => {
      window.removeEventListener('popstate', handlePopState);
      history.pushState = originalPush;
      history.replaceState = originalReplace;
    };
  }, []);

  // Prefetch ALL core data immediately on mount
  useEffect(() => {
    if (hasPrefetchedCore.current) return;

    hasPrefetchedCore.current = true;
    const region = localStorage.getItem('selectedRegion');

    void (async () => {
      const { prefetchHomeFeed, prefetchProfile } = await import('@/lib/routePrefetch');

      await Promise.all([
        prefetchHomeFeed(region),
        prefetchStoriesData(),
        prefetchMessagesData(),
        prefetchNotificationsData(),
        user?.id ? prefetchProfile(user.id) : Promise.resolve(),
      ]);
    })();
  }, [user?.id]);

  const prefetchRoute = useCallback(
    async (path: string) => {
      if (prefetchedRoutes.current.has(path)) return;

      prefetchedRoutes.current.add(path);
      const region = localStorage.getItem('selectedRegion');
      const { prefetchHomeFeed, prefetchProfile } = await import('@/lib/routePrefetch');

      if (path === '/home' || path === '/') {
        await Promise.all([prefetchHomeFeed(region), prefetchStoriesData()]);
      } else if (path === '/profile' && user?.id) {
        await prefetchProfile(user.id);
      } else if (path === '/messages') {
        await prefetchMessagesData();
      } else if (path === '/notifications') {
        await prefetchNotificationsData();
      }
    },
    [user?.id]
  );

  useEffect(() => {
    prefetchRoute(pathname);
  }, [pathname, prefetchRoute]);

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
