import { useCallback, useEffect, useState, useRef } from "react";

interface SimpleQueryOptions<T> {
  queryFn: () => Promise<T>;
  enabled?: boolean;
  cacheKey?: string;
  staleTime?: number;
  // New options for better performance
  refetchOnMount?: boolean;
  keepPreviousData?: boolean;
}

interface SimpleQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<void>;
  isFetching: boolean;
}

// Global cache with improved structure
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
}

const cache = new Map<string, CacheEntry<any>>();
const pendingRequests = new Map<string, Promise<any>>();
const subscribers = new Map<string, Set<() => void>>();

// Utility to invalidate cache for a specific key
export function invalidateCache(key: string): void {
  cache.delete(key);
  pendingRequests.delete(key);
  // Notify all subscribers
  subscribers.get(key)?.forEach(callback => callback());
}

// Utility to invalidate all cache keys matching a pattern
export function invalidateCachePattern(pattern: string): void {
  const regex = new RegExp(pattern);
  cache.forEach((_, key) => {
    if (regex.test(key)) {
      invalidateCache(key);
    }
  });
}

// Prefetch data into cache
export async function prefetchQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  staleTime: number = 30000
): Promise<void> {
  // Skip if already fresh in cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < staleTime) {
    return;
  }

  // Skip if already fetching
  if (pendingRequests.has(cacheKey)) {
    return;
  }

  const promise = queryFn();
  pendingRequests.set(cacheKey, promise);

  try {
    const result = await promise;
    cache.set(cacheKey, { data: result, timestamp: Date.now(), isStale: false });
  } catch (err) {
    console.error(`Prefetch error for ${cacheKey}:`, err);
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

export function useSimpleQuery<T>(options: SimpleQueryOptions<T>): SimpleQueryResult<T> {
  const { 
    queryFn, 
    enabled = true, 
    cacheKey, 
    staleTime = 30000,
    refetchOnMount = true,
    keepPreviousData = true
  } = options;
  
  // Initialize with cached data immediately (stale-while-revalidate)
  const [data, setData] = useState<T | undefined>(() => {
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached) {
        return cached.data;
      }
    }
    return undefined;
  });
  const [isLoading, setIsLoading] = useState(!data);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<unknown>(undefined);
  const mountedRef = useRef(true);
  const queryFnRef = useRef(queryFn);
  
  // Update queryFn ref to avoid stale closures
  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);

  const fetchData = useCallback(async (force: boolean = false) => {
    if (!enabled) return;
    
    // Check cache first (unless forcing refresh)
    if (cacheKey && !force) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < staleTime) {
        if (mountedRef.current && cached.data !== data) {
          setData(cached.data);
          setIsLoading(false);
        }
        return;
      }

      // Deduplicate pending requests
      const pending = pendingRequests.get(cacheKey);
      if (pending) {
        try {
          const result = await pending;
          if (mountedRef.current) {
            setData(result);
            setIsLoading(false);
          }
          return;
        } catch (err) {
          // Continue to make a new request
        }
      }
    }
    
    // Only show loading if we don't have data yet
    if (mountedRef.current) {
      if (!data && !keepPreviousData) {
        setIsLoading(true);
      }
      setIsFetching(true);
    }
    
    const requestPromise = queryFnRef.current();
    if (cacheKey) {
      pendingRequests.set(cacheKey, requestPromise);
    }
    
    try {
      const result = await requestPromise;
      if (mountedRef.current) {
        setData(result);
        setError(undefined);
        
        // Update cache
        if (cacheKey) {
          cache.set(cacheKey, { data: result, timestamp: Date.now(), isStale: false });
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
      }
    } finally {
      if (cacheKey) {
        pendingRequests.delete(cacheKey);
      }
      if (mountedRef.current) {
        setIsLoading(false);
        setIsFetching(false);
      }
    }
  }, [enabled, cacheKey, staleTime, data, keepPreviousData]);

  // Subscribe to cache invalidations
  useEffect(() => {
    if (!cacheKey) return;
    
    const callback = () => {
      fetchData(true);
    };
    
    if (!subscribers.has(cacheKey)) {
      subscribers.set(cacheKey, new Set());
    }
    subscribers.get(cacheKey)!.add(callback);
    
    return () => {
      subscribers.get(cacheKey)?.delete(callback);
    };
  }, [cacheKey, fetchData]);

  useEffect(() => {
    mountedRef.current = true;
    
    // Only fetch on mount if refetchOnMount is true or no cached data
    if (refetchOnMount || !data) {
      fetchData();
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData, refetchOnMount]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return { data, isLoading, error, refetch, isFetching };
}

interface SimpleMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData) => void;
}

interface SimpleMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>;
  isLoading: boolean;
  error: unknown;
}

export function useSimpleMutation<TData = any, TVariables = void>(
  options: SimpleMutationOptions<TData, TVariables>
): SimpleMutationResult<TData, TVariables> {
  const { mutationFn, onSuccess } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(undefined);

  const mutate = async (variables: TVariables) => {
    setIsLoading(true);
    try {
      const result = await mutationFn(variables);
      onSuccess?.(result);
      setError(undefined);
      return result;
    } catch (err) {
      console.error("useSimpleMutation error:", err);
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}
