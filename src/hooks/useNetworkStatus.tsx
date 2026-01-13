import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string | null;
  effectiveType: string | null;
}

// Debounce network changes to prevent rapid state updates
const DEBOUNCE_MS = 500; // Reduced for faster response
const SLOW_CONNECTION_THRESHOLD = 1500; // ms for ping test

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
  const checkingRef = useRef(false);

  const showToast = useCallback((message: string, type: 'warning' | 'success' | 'error') => {
    const now = Date.now();
    // Prevent toast spam - minimum 2 seconds between toasts
    if (now - lastToastRef.current < 2000) return;
    lastToastRef.current = now;
    
    if (type === 'warning') {
      toast.warning(message, { duration: 4000 });
    } else if (type === 'success') {
      toast.success(message, { duration: 2000 });
    } else {
      // Error (offline) - more prominent with longer duration
      toast.error(message, { 
        duration: 8000, // 8 seconds instead of infinite for better UX
        id: 'offline-toast',
      });
    }
  }, []);

  const checkConnectionSpeed = useCallback(async (): Promise<boolean> => {
    if (checkingRef.current) return false;
    checkingRef.current = true;

    try {
      const start = Date.now();

      // Use a tiny request to test connection speed.
      // NOTE: AbortSignal.timeout is not supported in some browsers (notably older iOS Safari),
      // so we implement a safe timeout via AbortController.
      const controller = new AbortController();
      const t = window.setTimeout(() => controller.abort(), 5000);

      try {
        await fetch('/favicon.png', {
          method: 'HEAD',
          cache: 'no-store',
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(t);
      }

      const duration = Date.now() - start;
      return duration > SLOW_CONNECTION_THRESHOLD;
    } catch {
      return true; // Assume slow if test fails
    } finally {
      checkingRef.current = false;
    }
  }, []);

  const updateNetworkStatus = useCallback(async (online: boolean, immediate = false) => {
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const performUpdate = async () => {
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

      // Additional speed check for online connections (but don't block)
      if (online && !connectionInfo.isSlowConnection) {
        // Don't await - check in background to prevent freezing
        checkConnectionSpeed().then(isSlow => {
          if (isSlow) {
            setStatus(prev => ({ ...prev, isSlowConnection: true }));
          }
        });
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
        showToast('No internet connection', 'error');
      } else if (online && wasOfflineRef.current) {
        wasOfflineRef.current = false;
        // Dismiss the offline toast when back online
        toast.dismiss('offline-toast');
        showToast('Back online!', 'success');
      }
    };

    // INSTANT for offline, debounced for online (to prevent flapping)
    if (!online || immediate) {
      performUpdate();
    } else {
      debounceRef.current = setTimeout(performUpdate, DEBOUNCE_MS);
    }
  }, [checkConnectionSpeed, showToast]);

  useEffect(() => {
    // Initial check
    updateNetworkStatus(navigator.onLine, true);

    const handleOnline = () => updateNetworkStatus(true);
    const handleOffline = () => updateNetworkStatus(false, true); // Immediate for offline

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes if available
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    const handleConnectionChange = () => updateNetworkStatus(navigator.onLine);
    
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Periodic online check to catch edge cases (every 30 seconds)
    const intervalId = setInterval(() => {
      if (navigator.onLine !== status.isOnline) {
        updateNetworkStatus(navigator.onLine);
      }
    }, 30000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [updateNetworkStatus, status.isOnline]);

  return status;
};

// Global singleton for checking network without hook
let globalNetworkStatus = { isOnline: true, isSlowConnection: false };

export const getNetworkStatus = () => globalNetworkStatus;

export const initNetworkMonitor = () => {
  // Make this initializer safe to call multiple times (HMR / re-imports)
  const FLAG = '__sv_network_monitor_installed__';
  if ((window as any)[FLAG]) return;
  (window as any)[FLAG] = true;

  const updateStatus = () => {
    globalNetworkStatus.isOnline = navigator.onLine;
  };

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  updateStatus();

  // Prevent app freeze on network issues - set up fetch timeout defaults.
  // Key goals:
  // 1) If offline, fail fast (don't let requests hang/retry forever)
  // 2) Only add a timeout when the caller didn't provide a signal
  const originalFetch = window.fetch.bind(window);

  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return Promise.reject(new TypeError('Network offline'));
    }

    // If the caller already handles aborts/timeouts, don't wrap.
    if (init?.signal) {
      return originalFetch(input, init);
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 30000);

    return originalFetch(input, { ...init, signal: controller.signal }).finally(() => {
      window.clearTimeout(timeoutId);
    });
  };
};
