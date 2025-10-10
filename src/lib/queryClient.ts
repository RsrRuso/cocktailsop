import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
      gcTime: 15 * 60 * 1000, // 15 minutes - aggressive caching
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 0, // Don't retry failed requests for faster loading
      networkMode: 'offlineFirst', // Use cache first for instant load
    },
  },
});
