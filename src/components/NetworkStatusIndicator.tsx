import { useEffect, useRef } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Wifi, WifiOff, Signal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export const NetworkStatusIndicator = () => {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const prevOnlineRef = useRef(isOnline);
  const hasShownOfflineRef = useRef(false);

  // Show toast notification INSTANTLY when connection goes down
  useEffect(() => {
    // Offline detection - instant and prominent
    if (!isOnline && !hasShownOfflineRef.current) {
      hasShownOfflineRef.current = true;
      toast.error("You're offline", {
        description: "Check your internet connection",
        icon: <WifiOff className="w-5 h-5 text-destructive" />,
        duration: Infinity,
        id: 'network-offline',
        className: 'bg-destructive text-destructive-foreground',
      });
    }
    
    // Back online - dismiss and show success
    if (isOnline && prevOnlineRef.current === false) {
      hasShownOfflineRef.current = false;
      toast.dismiss('network-offline');
      toast.success("Back online", {
        description: "Connection restored",
        icon: <Wifi className="w-5 h-5" />,
        duration: 2000,
      });
    }
    
    prevOnlineRef.current = isOnline;
  }, [isOnline]);

  // Only show persistent banner when there's an issue
  if (isOnline && !isSlowConnection) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center py-2 px-4 text-sm font-semibold shadow-lg"
        style={{
          backgroundColor: isOnline ? 'hsl(var(--warning))' : 'hsl(var(--destructive))',
          color: 'white',
        }}
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 mr-2 animate-pulse" />
            <span>No Internet Connection</span>
          </>
        ) : (
          <>
            <Signal className="w-4 h-4 mr-2" />
            <span>Slow connection - some features may be delayed</span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
