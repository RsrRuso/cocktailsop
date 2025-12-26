/**
 * Lab Ops Specific Rate Limiting
 * 
 * Dedicated rate limits for Lab Ops operations to:
 * - Prevent overload during peak service hours
 * - Protect database from heavy POS traffic
 * - Ensure fair resource distribution
 */

interface LabOpsRateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Lab Ops specific rate limit configurations
export const LAB_OPS_RATE_LIMITS: Record<string, LabOpsRateLimitConfig> = {
  // Order operations - high frequency during service
  'order-create': { maxRequests: 120, windowMs: 60000 }, // 120/min per outlet
  'order-update': { maxRequests: 200, windowMs: 60000 }, // 200/min per outlet
  'order-void': { maxRequests: 30, windowMs: 60000 },    // 30/min per outlet
  
  // Inventory operations
  'inventory-update': { maxRequests: 60, windowMs: 60000 }, // 60/min
  'inventory-count': { maxRequests: 30, windowMs: 60000 },  // 30/min
  
  // KDS operations - very high frequency
  'kds-refresh': { maxRequests: 60, windowMs: 60000 },     // 1/sec max
  'kds-update-status': { maxRequests: 300, windowMs: 60000 }, // 5/sec
  
  // Analytics - expensive queries
  'analytics-daily': { maxRequests: 10, windowMs: 60000 },  // 10/min
  'analytics-report': { maxRequests: 5, windowMs: 60000 },  // 5/min
  
  // Staff operations
  'staff-clock-in': { maxRequests: 10, windowMs: 60000 },   // 10/min
  'staff-verify-pin': { maxRequests: 20, windowMs: 60000 }, // 20/min (prevent brute force)
};

// In-memory rate limit storage (per outlet)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if a Lab Ops action is within rate limits
 */
export function checkLabOpsRateLimit(
  action: string,
  outletId: string
): { allowed: boolean; remaining: number; resetIn: number } {
  const config = LAB_OPS_RATE_LIMITS[action];
  if (!config) {
    return { allowed: true, remaining: 999, resetIn: 0 };
  }

  const key = `${action}:${outletId}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Reset if window expired
  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    };
  }

  // Check if within limits
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetAt - now,
    };
  }

  // Increment and allow
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetAt - now,
  };
}

/**
 * React hook for Lab Ops rate-limited actions
 */
export function useLabOpsRateLimit(action: string, outletId: string) {
  const execute = async <T>(fn: () => Promise<T>): Promise<T> => {
    const status = checkLabOpsRateLimit(action, outletId);
    
    if (!status.allowed) {
      throw new LabOpsRateLimitError(
        `Rate limit exceeded for ${action}. Try again in ${Math.ceil(status.resetIn / 1000)}s`,
        status.resetIn
      );
    }
    
    return fn();
  };

  const getStatus = () => checkLabOpsRateLimit(action, outletId);

  return { execute, getStatus };
}

/**
 * Custom error for Lab Ops rate limiting
 */
export class LabOpsRateLimitError extends Error {
  retryAfter: number;
  
  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = 'LabOpsRateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Get current rate limit status for monitoring
 */
export function getLabOpsRateLimitStatus(outletId: string): Record<string, {
  action: string;
  count: number;
  remaining: number;
  resetIn: number;
}> {
  const status: Record<string, any> = {};
  const now = Date.now();

  Object.keys(LAB_OPS_RATE_LIMITS).forEach(action => {
    const key = `${action}:${outletId}`;
    const entry = rateLimitStore.get(key);
    const config = LAB_OPS_RATE_LIMITS[action];

    if (entry && now < entry.resetAt) {
      status[action] = {
        action,
        count: entry.count,
        remaining: config.maxRequests - entry.count,
        resetIn: entry.resetAt - now,
      };
    } else {
      status[action] = {
        action,
        count: 0,
        remaining: config.maxRequests,
        resetIn: 0,
      };
    }
  });

  return status;
}
