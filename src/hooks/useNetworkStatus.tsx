import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { WifiOff, Signal } from 'lucide-react';

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string | null;
  effectiveType: string | null;
}

// Debounce network changes to prevent rapid state updates
const DEBOUNCE_MS = 1000;
const SLOW_CONNECTION_THRESHOLD = 1500; // ms for ping test

// Safe timeout helper for older Safari/iOS compatibility
const createTimeoutController = (ms: number): { controller: AbortController; timeoutId: NodeJS.Timeout } => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  return { controller, timeoutId };
};

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
  const slowConnectionShownRef = useRef(false);

  const showSlowConnectionPopup = useCallback(() => {
    if (slowConnectionShownRef.current) return;
    slowConnectionShownRef.current = true;
    
    toast.warning("Slow Connection Detected", {
      description: "Your internet is slow. Some features may take longer to load.",
      icon: <Signal className="w-5 h-5 text-amber-500" />,
      duration: 8000,
      id: 'slow-connection-popup',
      action: {
        label: "Got it",
        onClick: () => toast.dismiss('slow-connection-popup'),
      },
    });
    
    // Reset after 30 seconds to allow re-notification
    setTimeout(() => {
      slowConnectionShownRef.current = false;
    }, 30000);
  }, []);

  const showToast = useCallback((message: string, type: 'warning' | 'success' | 'error') => {
    const now = Date.now();
    // Prevent toast spam - minimum 3 seconds between toasts
    if (now - lastToastRef.current < 3000) return;
    lastToastRef.current = now;
    
    if (type === 'warning') {
      showSlowConnectionPopup();
    } else if (type === 'success') {
      toast.success(message, { 
        duration: 2000,
        icon: <Signal className="w-5 h-5 text-green-500" />,
      });
    } else {
      // Error (offline) - more prominent with longer duration
      toast.error(message, { 
        description: "Check your internet connection and try again.",
        icon: <WifiOff className="w-5 h-5 text-destructive" />,
        duration: Infinity,
        id: 'offline-toast',
      });
    }
  }, [showSlowConnectionPopup]);

  const checkConnectionSpeed = useCallback(async (): Promise<boolean> => {
    // Skip if offline
    if (!navigator.onLine) return true;
    
    try {
      const start = Date.now();
      const { controller, timeoutId } = createTimeoutController(5000);
      
      await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const duration = Date.now() - start;
      return duration > SLOW_CONNECTION_THRESHOLD;
    } catch {
      return true; // Assume slow if test fails
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

      // Additional speed check for online connections (non-blocking)
      if (online && !connectionInfo.isSlowConnection) {
        // Run speed check in background to avoid blocking
        checkConnectionSpeed().then(isSlow => {
          if (isSlow) {
            setStatus(prev => ({ ...prev, isSlowConnection: true }));
            showSlowConnectionPopup();
          }
        }).catch(() => {});
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
        showToast('You\'re offline', 'error');
      } else if (online && wasOfflineRef.current) {
        wasOfflineRef.current = false;
        slowConnectionShownRef.current = false;
        toast.dismiss('offline-toast');
        toast.dismiss('slow-connection-popup');
        showToast('Back online!', 'success');
      } else if (online && connectionInfo.isSlowConnection) {
        showSlowConnectionPopup();
      }
    };

    // INSTANT for offline, debounced for online (to prevent flapping)
    if (!online || immediate) {
      performUpdate();
    } else {
      debounceRef.current = setTimeout(performUpdate, DEBOUNCE_MS);
    }
  }, [checkConnectionSpeed, showToast, showSlowConnectionPopup]);

  useEffect(() => {
    // Defer initial check to avoid blocking first paint
    const timeoutId = setTimeout(() => {
      updateNetworkStatus(navigator.onLine);
    }, 100);

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

    return () => {
      clearTimeout(timeoutId);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [updateNetworkStatus]);

  return status;
};

// Global singleton for checking network without hook
let globalNetworkStatus = { isOnline: true, isSlowConnection: false };
let networkMonitorInitialized = false;

export const getNetworkStatus = () => globalNetworkStatus;

export const initNetworkMonitor = () => {
  // Prevent double initialization
  if (networkMonitorInitialized) return;
  networkMonitorInitialized = true;
  
  const updateStatus = () => {
    globalNetworkStatus.isOnline = navigator.onLine;
  };
  
  // Defer to avoid blocking first paint
  setTimeout(() => {
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  }, 0);
};
