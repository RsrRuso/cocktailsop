import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000, // 30 minutes - very aggressive caching
      gcTime: 60 * 60 * 1000, // Keep cache for 1 hour
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 1,
      retryDelay: 300,
      networkMode: 'offlineFirst',
      placeholderData: (previousData: any) => previousData, // Always show old data instantly
    },
    mutations: {
      retry: 1,
    },
  },
});
