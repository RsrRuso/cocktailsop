import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000, // 15 minutes - more aggressive caching
      gcTime: 45 * 60 * 1000, // Keep cache for 45 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false, // Don't refetch on reconnect for faster loads
      refetchOnMount: false,
      retry: 1, // Faster failure
      retryDelay: 500, // Shorter retry delay
      networkMode: 'offlineFirst',
      placeholderData: (previousData: any) => previousData,
    },
    mutations: {
      retry: 1,
    },
  },
});
