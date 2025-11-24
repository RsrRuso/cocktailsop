import { useCallback, useRef } from 'react';

/**
 * Performance optimization for engagement actions
 * Debounces rapid actions and deduplicates requests
 */
export const useEngagementOptimization = () => {
  const pendingActions = useRef<Map<string, number>>(new Map());
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const debounce = useCallback((key: string, action: () => void, delay: number = 300) => {
    // Clear existing timer for this key
    const existingTimer = debounceTimers.current.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      action();
      debounceTimers.current.delete(key);
    }, delay);

    debounceTimers.current.set(key, timer);
  }, []);

  const isDuplicateAction = useCallback((actionKey: string): boolean => {
    const now = Date.now();
    const lastAction = pendingActions.current.get(actionKey);
    
    // Prevent duplicate actions within 500ms
    if (lastAction && now - lastAction < 500) {
      return true;
    }

    pendingActions.current.set(actionKey, now);
    
    // Clean up old entries
    setTimeout(() => {
      pendingActions.current.delete(actionKey);
    }, 1000);

    return false;
  }, []);

  const optimizedAction = useCallback(
    (actionKey: string, action: () => Promise<void>) => {
      if (isDuplicateAction(actionKey)) {
        console.log(`[OPTIMIZATION] Prevented duplicate action: ${actionKey}`);
        return Promise.resolve();
      }
      return action();
    },
    [isDuplicateAction]
  );

  return { debounce, optimizedAction, isDuplicateAction };
};
