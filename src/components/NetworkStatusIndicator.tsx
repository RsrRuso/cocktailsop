import { useEffect, useRef } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Wifi, WifiOff, Signal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export const NetworkStatusIndicator = () => {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const prevOnlineRef = useRef(isOnline);

  // Show toast notification when connection status changes
  useEffect(() => {
    // Only trigger on actual status change (not initial mount)
    if (prevOnlineRef.current !== isOnline) {
      if (!isOnline) {
        toast.error("You're offline", {
          description: "Check your internet connection",
          icon: <WifiOff className="w-5 h-5" />,
          duration: 5000,
        });
      } else {
        toast.success("Back online", {
          description: "Connection restored",
          icon: <Wifi className="w-5 h-5" />,
          duration: 3000,
        });
      }
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline]);

  // Only show persistent indicator when there's an issue
  if (isOnline && !isSlowConnection) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center py-1.5 px-4 text-xs font-medium"
        style={{
          backgroundColor: isOnline ? 'hsl(var(--warning) / 0.9)' : 'hsl(var(--destructive) / 0.9)',
          color: 'white',
        }}
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 mr-1.5" />
            <span>You're offline - using cached data</span>
          </>
        ) : (
          <>
            <Signal className="w-3.5 h-3.5 mr-1.5" />
            <span>Slow connection - some features may be delayed</span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
