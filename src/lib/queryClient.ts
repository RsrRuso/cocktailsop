import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 60 * 1000, // 30 minutes - balance between fresh and fast
      gcTime: 24 * 60 * 60 * 1000, // Keep cache for 24 hours
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // Refetch when back online
      refetchOnMount: false,
      retry: 1, // Retry once on failure
      networkMode: 'offlineFirst',
      placeholderData: (previousData: any) => previousData,
    },
  },
});
