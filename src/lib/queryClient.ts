import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - increased for better caching
      gcTime: 15 * 60 * 1000, // Keep cache for 15 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      retry: 1,
      retryDelay: 50, // Reduced from 100ms
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
