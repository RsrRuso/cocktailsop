// Request deduplication - prevents multiple identical API calls
const pendingRequests = new Map<string, Promise<any>>();

export const deduplicateRequest = async <T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> => {
  // If same request is already pending, return that promise
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  // Create new request
  const promise = requestFn().finally(() => {
    // Clean up after request completes
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
};

// Clear all pending requests
export const clearPendingRequests = () => {
  pendingRequests.clear();
};
