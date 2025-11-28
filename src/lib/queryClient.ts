import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000, // 15 minutes - aggressive caching for speed
      gcTime: 60 * 60 * 1000, // Keep cache for 1 hour
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 1,
      retryDelay: 100,
      networkMode: 'offlineFirst',
      placeholderData: (previousData: any) => previousData,
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
      onSuccess: () => {
        // Track cache performance
        const hits = parseInt(sessionStorage.getItem('cache_hits') || '0');
        sessionStorage.setItem('cache_hits', String(hits + 1));
      },
      onError: () => {
        // Track cache misses
        const misses = parseInt(sessionStorage.getItem('cache_misses') || '0');
        sessionStorage.setItem('cache_misses', String(misses + 1));
      },
    },
  },
});
