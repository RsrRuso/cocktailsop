import { useCallback, useRef } from 'react';

/**
 * Memoized callback that only updates when dependencies truly change
 * Prevents unnecessary re-renders from callback recreation
 */
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[]
): T {
  const callbackRef = useRef<T>(callback);
  
  // Update ref if callback changes
  callbackRef.current = callback;
  
  // Return memoized callback
  return useCallback(
    ((...args: any[]) => callbackRef.current(...args)) as T,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );
}
