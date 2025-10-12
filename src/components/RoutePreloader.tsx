import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { prefetchProfile, prefetchHomeFeed } from '@/lib/routePrefetch';
import { useAuth } from '@/contexts/AuthContext';

export const RoutePreloader = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // Prefetch data based on current route
    const prefetchData = async () => {
      if (location.pathname === '/home' && user?.id) {
        const region = localStorage.getItem('selectedRegion');
        await prefetchHomeFeed(region);
      } else if (location.pathname === '/profile' && user?.id) {
        await prefetchProfile(user.id);
      }
    };

    // Debounce prefetching
    const timer = setTimeout(prefetchData, 100);
    return () => clearTimeout(timer);
  }, [location.pathname, user?.id]);

  // Prefetch on link hover
  useEffect(() => {
    const handleMouseEnter = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (!link || !user?.id) return;

      const href = link.getAttribute('href');
      if (href === '/profile') {
        await prefetchProfile(user.id);
      } else if (href === '/home') {
        const region = localStorage.getItem('selectedRegion');
        await prefetchHomeFeed(region);
      }
    };

    document.addEventListener('mouseenter', handleMouseEnter, true);
    return () => document.removeEventListener('mouseenter', handleMouseEnter, true);
  }, [user?.id]);

  return null;
};
