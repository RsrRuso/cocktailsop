import { useCallback, useEffect, useState } from "react";

interface SimpleQueryOptions<T> {
  queryFn: () => Promise<T>;
  enabled?: boolean;
}

interface SimpleQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<void>;
}

export function useSimpleQuery<T>(options: SimpleQueryOptions<T>): SimpleQueryResult<T> {
  const { queryFn, enabled = true } = options;
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(undefined);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    try {
      const result = await queryFn();
      setData(result);
      setError(undefined);
    } catch (err) {
      console.error("useSimpleQuery error:", err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, queryFn]);

  useEffect(() => {
    fetchData();
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
