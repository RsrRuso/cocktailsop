/**
 * Rate Limiting System for 10k+ Users
 * 
 * Protects expensive operations like:
 * - AI API calls
 * - File uploads
 * - API requests
 * - Database writes
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
  blocked?: boolean;
  blockedUntil?: number;
}

// In-memory rate limit storage (per browser session)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configurations for different actions
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // AI features - expensive API calls
  'ai-chat': { maxRequests: 20, windowMs: 60 * 1000 }, // 20 per minute
  'ai-generate': { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  'ai-voice': { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute
  
  // Uploads - storage costs
  'upload-image': { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute
  'upload-video': { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  'upload-reel': { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute
  
  // Social actions - prevent spam
  'post-create': { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  'comment-create': { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute
  'like-action': { maxRequests: 100, windowMs: 60 * 1000 }, // 100 per minute
  'follow-action': { maxRequests: 50, windowMs: 60 * 1000 }, // 50 per minute
  'message-send': { maxRequests: 60, windowMs: 60 * 1000 }, // 60 per minute
  
  // Story/reel creation - resource heavy
  'story-create': { maxRequests: 20, windowMs: 60 * 1000 }, // 20 per minute
  'reel-create': { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute
  
  // Search - database heavy
  'search': { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute
  
  // API calls - general protection
  'api-call': { maxRequests: 100, windowMs: 60 * 1000 }, // 100 per minute
};

/**
 * Check if an action is rate limited
 * @returns { allowed: boolean, remaining: number, resetIn: number }
 */
export const checkRateLimit = (
  action: string,
  userId?: string
): { allowed: boolean; remaining: number; resetIn: number; retryAfter?: number } => {
  const config = RATE_LIMITS[action];
  if (!config) {
    return { allowed: true, remaining: 999, resetIn: 0 };
  }

  const key = userId ? `${action}:${userId}` : action;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Check if blocked
  if (entry?.blocked && entry.blockedUntil && entry.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.blockedUntil - now,
      retryAfter: entry.blockedUntil - now,
    };
  }

  // Check if window expired
  if (!entry || now - entry.windowStart > config.windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    };
  }

  // Check if limit reached
  if (entry.count >= config.maxRequests) {
    const resetIn = config.windowMs - (now - entry.windowStart);
    
    // Apply block if configured
    if (config.blockDurationMs) {
      entry.blocked = true;
      entry.blockedUntil = now + config.blockDurationMs;
    }
    
    return {
      allowed: false,
      remaining: 0,
      resetIn,
      retryAfter: resetIn,
    };
  }

  // Increment counter
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetIn: config.windowMs - (now - entry.windowStart),
  };
};

/**
 * Rate limit decorator for async functions
 */
export const withRateLimit = <T extends (...args: any[]) => Promise<any>>(
  action: string,
  fn: T,
  userId?: string
): T => {
  return (async (...args: Parameters<T>) => {
    const { allowed, retryAfter } = checkRateLimit(action, userId);
    
    if (!allowed) {
      const seconds = Math.ceil((retryAfter || 60000) / 1000);
      throw new RateLimitError(
        `Too many requests. Please wait ${seconds} seconds.`,
        retryAfter || 60000
      );
    }
    
    return fn(...args);
  }) as T;
};

/**
 * Custom error for rate limiting
 */
export class RateLimitError extends Error {
  retryAfter: number;
  
  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Hook for rate-limited actions
 */
export const useRateLimitedAction = (action: string, userId?: string) => {
  const execute = async <T>(fn: () => Promise<T>): Promise<T> => {
    const { allowed, retryAfter, remaining } = checkRateLimit(action, userId);
    
    if (!allowed) {
      const seconds = Math.ceil((retryAfter || 60000) / 1000);
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${seconds}s.`,
        retryAfter || 60000
      );
    }
    
    return fn();
  };

  const getStatus = () => {
    const config = RATE_LIMITS[action];
    if (!config) return { remaining: 999, limit: 999, resetIn: 0 };
    
    const key = userId ? `${action}:${userId}` : action;
    const entry = rateLimitStore.get(key);
    const now = Date.now();
    
    if (!entry || now - entry.windowStart > config.windowMs) {
      return { remaining: config.maxRequests, limit: config.maxRequests, resetIn: 0 };
    }
    
    return {
      remaining: Math.max(0, config.maxRequests - entry.count),
      limit: config.maxRequests,
      resetIn: config.windowMs - (now - entry.windowStart),
    };
  };

  return { execute, getStatus };
};

/**
 * Clear rate limit for a specific action (for testing/admin)
 */
export const clearRateLimit = (action: string, userId?: string) => {
  const key = userId ? `${action}:${userId}` : action;
  rateLimitStore.delete(key);
};

/**
 * Get all rate limit statuses (for debugging)
 */
export const getRateLimitStatus = (): Record<string, { count: number; remaining: number; resetIn: number }> => {
  const status: Record<string, { count: number; remaining: number; resetIn: number }> = {};
  const now = Date.now();
  
  rateLimitStore.forEach((entry, key) => {
    const action = key.split(':')[0];
    const config = RATE_LIMITS[action];
    if (!config) return;
    
    const windowElapsed = now - entry.windowStart;
    if (windowElapsed > config.windowMs) return;
    
    status[key] = {
      count: entry.count,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetIn: config.windowMs - windowElapsed,
    };
  });
  
  return status;
};
