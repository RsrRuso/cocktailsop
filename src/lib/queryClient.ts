import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes - keep data fresh longer
      gcTime: 30 * 60 * 1000, // 30 minutes - aggressive caching
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 1,
      networkMode: 'offlineFirst', // Use cache first for instant load
    },
  },
});
