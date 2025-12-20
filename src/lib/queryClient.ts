import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';

// Custom error handler that doesn't spam errors on network issues
const handleQueryError = (error: unknown) => {
  // Silently handle network errors - don't log spam during offline/slow connection
  if (error instanceof Error) {
    const isNetworkError = 
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('timeout') ||
      error.name === 'AbortError';
    
    if (!isNetworkError) {
      console.error('Query error:', error.message);
    }
  }
};

// Aggressive caching for faster loading with better offline support
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleQueryError,
  }),
  mutationCache: new MutationCache({
    onError: handleQueryError,
  }),
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000, // 15 minutes - data stays fresh even longer
      gcTime: 2 * 60 * 60 * 1000, // 2 hours - keep in cache longer for repeat visits
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always', // Refetch when back online
      refetchOnMount: false,
      retry: (failureCount, error) => {
        // Don't retry on network errors when offline
        if (!navigator.onLine) return false;
        // Retry only once to reduce API calls on errors
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 15000),
      networkMode: 'offlineFirst', // Use cache first, fetch in background
      structuralSharing: true, // Optimize re-renders
    },
    mutations: {
      retry: (failureCount, error) => {
        if (!navigator.onLine) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      networkMode: 'offlineFirst',
    },
  },
});
