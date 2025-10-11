import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - faster updates
      gcTime: 60 * 60 * 1000, // Keep cache for 1 hour
      refetchOnWindowFocus: false,
      refetchOnReconnect: false, // Don't refetch on reconnect for speed
      refetchOnMount: false,
      retry: 0, // No retries for instant feedback
      networkMode: 'online', // Only fetch when online for speed
    },
  },
});
