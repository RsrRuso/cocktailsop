import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string | null;
  effectiveType: string | null;
}

// Debounce network changes to prevent rapid state updates
const DEBOUNCE_MS = 1000;
const SLOW_CONNECTION_THRESHOLD = 1000; // ms for ping test

export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: null,
    effectiveType: null,
  });
  
  const debounceRef = useRef<NodeJS.Timeout>();
  const lastToastRef = useRef<number>(0);
  const wasOfflineRef = useRef(false);

  const showToast = useCallback((message: string, type: 'warning' | 'success' | 'error') => {
    const now = Date.now();
    // Prevent toast spam - minimum 5 seconds between toasts
    if (now - lastToastRef.current < 5000) return;
    lastToastRef.current = now;
    
    if (type === 'warning') {
      toast.warning(message, { duration: 3000 });
    } else if (type === 'success') {
      toast.success(message, { duration: 2000 });
    } else {
      toast.error(message, { duration: 3000 });
    }
  }, []);

  const checkConnectionSpeed = useCallback(async (): Promise<boolean> => {
    try {
      const start = Date.now();
      // Use a tiny request to test connection speed
      await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000)
      });
      const duration = Date.now() - start;
      return duration > SLOW_CONNECTION_THRESHOLD;
    } catch {
      return true; // Assume slow if test fails
    }
  }, []);

  const updateNetworkStatus = useCallback(async (online: boolean) => {
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      let connectionInfo: Partial<NetworkStatus> = {
        isOnline: online,
        connectionType: null,
        effectiveType: null,
        isSlowConnection: false,
      };

      // Get connection info if available
      const connection = (navigator as any).connection || 
                        (navigator as any).mozConnection || 
                        (navigator as any).webkitConnection;

      if (connection) {
        connectionInfo.connectionType = connection.type || null;
        connectionInfo.effectiveType = connection.effectiveType || null;
        
        // Check for slow connection types
        const slowTypes = ['slow-2g', '2g', '3g'];
        if (slowTypes.includes(connection.effectiveType)) {
          connectionInfo.isSlowConnection = true;
        }
      }

      // Additional speed check for online connections
      if (online && !connectionInfo.isSlowConnection) {
        connectionInfo.isSlowConnection = await checkConnectionSpeed();
      }

      setStatus(prev => {
        // Only update if something changed
        if (prev.isOnline === connectionInfo.isOnline && 
            prev.isSlowConnection === connectionInfo.isSlowConnection) {
          return prev;
        }
        return { ...prev, ...connectionInfo };
      });

      // Show appropriate toasts
      if (!online && !wasOfflineRef.current) {
        wasOfflineRef.current = true;
        showToast('You\'re offline. Using cached data.', 'warning');
      } else if (online && wasOfflineRef.current) {
        wasOfflineRef.current = false;
        showToast('Back online!', 'success');
      } else if (online && connectionInfo.isSlowConnection) {
        showToast('Slow connection detected. Some features may be delayed.', 'warning');
      }
    }, DEBOUNCE_MS);
  }, [checkConnectionSpeed, showToast]);

  useEffect(() => {
    // Initial check
    updateNetworkStatus(navigator.onLine);

    const handleOnline = () => updateNetworkStatus(true);
    const handleOffline = () => updateNetworkStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes if available
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', () => updateNetworkStatus(navigator.onLine));
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', () => updateNetworkStatus(navigator.onLine));
      }
    };
  }, [updateNetworkStatus]);

  return status;
};

// Global singleton for checking network without hook
let globalNetworkStatus = { isOnline: true, isSlowConnection: false };

export const getNetworkStatus = () => globalNetworkStatus;

export const initNetworkMonitor = () => {
  const updateStatus = () => {
    globalNetworkStatus.isOnline = navigator.onLine;
  };
  
  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  updateStatus();
};
