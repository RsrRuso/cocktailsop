import { useCallback, useEffect, useState, useRef } from "react";

interface SimpleQueryOptions<T> {
  queryFn: () => Promise<T>;
  enabled?: boolean;
  cacheKey?: string;
  staleTime?: number;
}

interface SimpleQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<void>;
}

// Global cache and request deduplication
const cache = new Map<string, { data: any; timestamp: number }>();
const pendingRequests = new Map<string, Promise<any>>();

export function useSimpleQuery<T>(options: SimpleQueryOptions<T>): SimpleQueryResult<T> {
  const { queryFn, enabled = true, cacheKey, staleTime = 30000 } = options;
  const [data, setData] = useState<T | undefined>(() => {
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < staleTime) {
        return cached.data;
      }
    }
    return undefined;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(undefined);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    // Check cache first
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < staleTime) {
        if (mountedRef.current) {
          setData(cached.data);
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
          }
          return;
        } catch (err) {
          // Continue to make a new request
        }
      }
    }
    
    if (mountedRef.current) {
      setIsLoading(true);
    }
    
    const requestPromise = queryFn();
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
          cache.set(cacheKey, { data: result, timestamp: Date.now() });
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
      }
    }
  }, [enabled, queryFn, cacheKey, staleTime]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
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
