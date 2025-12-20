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
      staleTime: 10 * 60 * 1000, // 10 minutes - data stays fresh longer
      gcTime: 60 * 60 * 1000, // 1 hour - keep in cache longer
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always', // Refetch when back online
      refetchOnMount: false,
      retry: (failureCount, error) => {
        // Don't retry on network errors when offline
        if (!navigator.onLine) return false;
        // Retry up to 2 times with exponential backoff
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
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
