import { useEffect, useCallback, useRef, useState } from 'react';
import { prefetchProfile, prefetchHomeFeed, prefetchLabOps } from '@/lib/routePrefetch';
import { prefetchStoriesData } from '@/hooks/useStoriesData';
import { prefetchMessagesData } from '@/hooks/useMessagesData';
import { prefetchNotificationsData } from '@/hooks/useNotificationsData';
import { prefetchWasabiData } from '@/hooks/useWasabiData';
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
    history.pushState = (...args) => { originalPush(...args); setPathname(window.location.pathname); };
    history.replaceState = (...args) => { originalReplace(...args); setPathname(window.location.pathname); };
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      history.pushState = originalPush;
      history.replaceState = originalReplace;
    };
  }, []);

  // Prefetch ALL core data shortly after mount (defer to idle so it doesn't block first interaction)
  useEffect(() => {
    if (hasPrefetchedCore.current) return;
    hasPrefetchedCore.current = true;

    const region = localStorage.getItem('selectedRegion');

    const run = () => {
      // If offline, skip background prefetching to avoid hanging requests + UI jank.
      if (!navigator.onLine) return;

      Promise.all([
        prefetchHomeFeed(region),
        prefetchStoriesData(),
        prefetchMessagesData(),
        prefetchNotificationsData(),
        user?.id ? prefetchProfile(user.id) : Promise.resolve(),
      ]);
    };

    // Defer heavy prefetch work so Wasabi (and any first route) feels instant
    if ('requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(run, { timeout: 2000 });
      return () => (window as any).cancelIdleCallback?.(id);
    }

    const t = globalThis.setTimeout(run, 1200);
    return () => globalThis.clearTimeout(t);
  }, [user?.id]);

  const prefetchRoute = useCallback(async (path: string) => {
    // If offline, don't mark as prefetched—try again when online.
    if (!navigator.onLine) return;
    if (prefetchedRoutes.current.has(path)) return;

    prefetchedRoutes.current.add(path);
    const region = localStorage.getItem('selectedRegion');

    if (path === '/home' || path === '/') {
      await Promise.all([prefetchHomeFeed(region), prefetchStoriesData()]);
    } else if (path === '/profile' && user?.id) {
      await prefetchProfile(user.id);
    } else if (path === '/messages') {
      await prefetchMessagesData();
    } else if (path === '/notifications') {
      await prefetchNotificationsData();
    } else if (path.startsWith('/lab-ops') && user?.id) {
      await prefetchLabOps(user.id);
    } else if (path === '/community' || path.startsWith('/wasabi/')) {
      await prefetchWasabiData();
    }
  }, [user?.id]);

  useEffect(() => {
    prefetchRoute(pathname);
  }, [pathname, prefetchRoute]);

  useEffect(() => {
    const handleMouseEnter = (e: MouseEvent) => {
      if (!navigator.onLine) return;
      if (!(e.target instanceof Element)) return;
      const link = e.target.closest('a[href]') as HTMLAnchorElement;
      if (link) prefetchRoute(link.getAttribute('href') || '');
    };

    document.addEventListener('mouseenter', handleMouseEnter, true);
    return () => document.removeEventListener('mouseenter', handleMouseEnter, true);
  }, [prefetchRoute]);

  return null;
};
