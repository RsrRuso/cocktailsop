import { QueryClient } from '@tanstack/react-query';

// Aggressive caching for faster loading
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes - data stays fresh longer
      gcTime: 60 * 60 * 1000, // 1 hour - keep in cache longer
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 1,
      retryDelay: 100,
      networkMode: 'offlineFirst', // Use cache first, fetch in background
      structuralSharing: true, // Optimize re-renders
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});
