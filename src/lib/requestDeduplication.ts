// Request deduplication - prevents multiple identical API calls
const pendingRequests = new Map<string, Promise<any>>();
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export const deduplicateRequest = async <T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> => {
  const now = Date.now();
  
  // Check cache first
  const cached = requestCache.get(key);
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    console.log(`[DEDUP] Cache HIT for: ${key}`);
    return cached.data;
  }

  // If same request is already pending, return that promise
  if (pendingRequests.has(key)) {
    console.log(`[DEDUP] Request PENDING for: ${key}, reusing existing promise`);
    return pendingRequests.get(key) as Promise<T>;
  }

  console.log(`[DEDUP] Cache MISS for: ${key}, making new request`);

  // Create new request
  const promise = requestFn()
    .then((data) => {
      requestCache.set(key, { data, timestamp: now });
      return data;
    })
    .finally(() => {
      // Clean up after request completes
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, promise);
  return promise;
};

// Clear all pending requests
export const clearPendingRequests = () => {
  pendingRequests.clear();
  requestCache.clear();
};
