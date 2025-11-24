// Batch multiple API requests into fewer round trips
type BatchRequest = {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  query: any;
};

const requestQueues = new Map<string, BatchRequest[]>();
const batchTimeouts = new Map<string, NodeJS.Timeout>();

const BATCH_DELAY = 5; // ms - reduced from 10ms for faster batching

export const batchRequest = <T>(
  key: string,
  query: any,
  executeBatch: (queries: any[]) => Promise<T[]>
): Promise<T> => {
  return new Promise((resolve, reject) => {
    // Add to queue
    if (!requestQueues.has(key)) {
      requestQueues.set(key, []);
    }
    
    requestQueues.get(key)!.push({ resolve, reject, query });

    // Clear existing timeout
    if (batchTimeouts.has(key)) {
      clearTimeout(batchTimeouts.get(key)!);
    }

    // Set new timeout to execute batch
    const timeout = setTimeout(async () => {
      const batch = requestQueues.get(key) || [];
      requestQueues.delete(key);
      batchTimeouts.delete(key);

      if (batch.length === 0) return;

      try {
        const queries = batch.map(b => b.query);
        const results = await executeBatch(queries);
        
        batch.forEach((req, index) => {
          req.resolve(results[index]);
        });
      } catch (error) {
        batch.forEach(req => req.reject(error));
      }
    }, BATCH_DELAY);

    batchTimeouts.set(key, timeout);
  });
};
