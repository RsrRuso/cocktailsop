import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes - aggressive caching
      gcTime: 30 * 60 * 1000, // 30 minutes - keep cached data longer
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch on component mount
      refetchOnReconnect: false,
      retry: 1,
      networkMode: 'offlineFirst', // Use cache first, network second
    },
  },
});
