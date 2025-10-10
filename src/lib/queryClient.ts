import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // Data never goes stale - instant load from cache
      gcTime: 24 * 60 * 60 * 1000, // Keep cache for 24 hours
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 0,
      networkMode: 'offlineFirst',
      placeholderData: (previousData: any) => previousData, // Show old data immediately while fetching
    },
  },
});
