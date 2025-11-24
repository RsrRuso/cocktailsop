import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes - increased for better caching
      gcTime: 30 * 60 * 1000, // Keep cache for 30 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false, // Disabled to reduce network calls
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
