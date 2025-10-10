import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Preload routes on hover/interaction to make navigation instant
export const preloadRoute = (route: string) => {
  const preloadMap: Record<string, () => Promise<any>> = {
    '/home': () => import('@/pages/Home'),
    '/explore': () => import('@/pages/Explore'),
    '/profile': () => import('@/pages/Profile'),
    '/reels': () => import('@/pages/Reels'),
    '/messages': () => import('@/pages/Messages'),
    '/notifications': () => import('@/pages/Notifications'),
    '/create': () => import('@/pages/Create'),
  };

  const preloader = preloadMap[route];
  if (preloader) {
    preloader().catch(() => {
      // Ignore preload errors
    });
  }
};

// Preload routes based on current location
export const RoutePreloader = () => {
  const location = useLocation();

  useEffect(() => {
    // Preload likely next routes based on current location
    const preloadRoutes: Record<string, string[]> = {
      '/': ['/home', '/landing'],
      '/landing': ['/auth'],
      '/auth': ['/home'],
      '/home': ['/explore', '/profile', '/create', '/reels'],
      '/explore': ['/home', '/profile'],
      '/profile': ['/home', '/messages'],
      '/reels': ['/home'],
    };

    const routesToPreload = preloadRoutes[location.pathname] || [];
    
    // Preload after a short delay to prioritize current page
    const timer = setTimeout(() => {
      routesToPreload.forEach(route => preloadRoute(route));
    }, 1000);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return null;
};
