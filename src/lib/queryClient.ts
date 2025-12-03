import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - balanced caching
      gcTime: 30 * 60 * 1000, // Keep cache for 30 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      refetchOnMount: false,
      retry: 1,
      retryDelay: 100,
      networkMode: 'online',
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
