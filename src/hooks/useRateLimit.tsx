import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { checkRateLimit, RateLimitError, RATE_LIMITS } from '@/lib/rateLimit';
import { useAuth } from '@/contexts/AuthContext';

type RateLimitAction = keyof typeof RATE_LIMITS;

interface UseRateLimitOptions {
  showToast?: boolean;
  onLimitReached?: (retryAfter: number) => void;
}

/**
 * Hook to execute rate-limited actions with automatic error handling
 */
export const useRateLimit = (
  action: RateLimitAction,
  options: UseRateLimitOptions = {}
) => {
  const { showToast = true, onLimitReached } = options;
  const { user } = useAuth();
  const [isLimited, setIsLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);

  const execute = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      const result = checkRateLimit(action, user?.id);

      if (!result.allowed) {
        setIsLimited(true);
        setRetryAfter(result.retryAfter || 0);

        const seconds = Math.ceil((result.retryAfter || 60000) / 1000);

        if (showToast) {
          toast.error('Slow down!', {
            description: `Too many requests. Please wait ${seconds} seconds.`,
            duration: 3000,
          });
        }

        onLimitReached?.(result.retryAfter || 0);

        // Auto-reset after retry period
        setTimeout(() => {
          setIsLimited(false);
          setRetryAfter(0);
        }, result.retryAfter || 60000);

        return null;
      }

      try {
        setIsLimited(false);
        return await fn();
      } catch (error) {
        if (error instanceof RateLimitError) {
          setIsLimited(true);
          setRetryAfter(error.retryAfter);

          if (showToast) {
            const seconds = Math.ceil(error.retryAfter / 1000);
            toast.error('Rate limited', {
              description: `Please wait ${seconds} seconds.`,
            });
          }

          return null;
        }
        throw error;
      }
    },
    [action, user?.id, showToast, onLimitReached]
  );

  const getRemaining = useCallback(() => {
    const result = checkRateLimit(action, user?.id);
    return result.remaining;
  }, [action, user?.id]);

  return {
    execute,
    isLimited,
    retryAfter,
    getRemaining,
  };
};

/**
 * Simple rate limit check without hook state
 */
export const useQuickRateCheck = () => {
  const { user } = useAuth();

  return useCallback(
    (action: RateLimitAction): boolean => {
      const result = checkRateLimit(action, user?.id);

      if (!result.allowed) {
        const seconds = Math.ceil((result.retryAfter || 60000) / 1000);
        toast.error('Slow down!', {
          description: `Please wait ${seconds} seconds.`,
          duration: 2000,
        });
        return false;
      }

      return true;
    },
    [user?.id]
  );
};
