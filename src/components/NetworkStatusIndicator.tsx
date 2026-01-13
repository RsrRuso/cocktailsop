import { useEffect, useRef, useState } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Wifi, WifiOff, Signal, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export const NetworkStatusIndicator = () => {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const prevOnlineRef = useRef(isOnline);
  const [showFullModal, setShowFullModal] = useState(false);
  const offlineTimeRef = useRef<number | null>(null);

  // Show full modal after 3 seconds of being offline
  useEffect(() => {
    if (!isOnline) {
      offlineTimeRef.current = Date.now();
      const timer = setTimeout(() => {
        setShowFullModal(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      offlineTimeRef.current = null;
      setShowFullModal(false);
    }
  }, [isOnline]);

  // Track when going back online
  useEffect(() => {
    if (isOnline && prevOnlineRef.current === false) {
      setShowFullModal(false);
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline]);

  const handleRetry = () => {
    window.location.reload();
  };

  // Full screen offline modal
  if (!isOnline && showFullModal) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-background/95 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="flex flex-col items-center gap-6 p-8 text-center max-w-sm mx-4"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-24 h-24 rounded-full bg-destructive/20 flex items-center justify-center"
            >
              <WifiOff className="w-12 h-12 text-destructive" />
            </motion.div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">No Internet Connection</h2>
              <p className="text-muted-foreground">
                Please check your network connection and try again.
              </p>
            </div>

            <Button 
              onClick={handleRetry}
              size="lg"
              className="gap-2 mt-4"
            >
              <RefreshCw className="w-5 h-5" />
              Retry Connection
            </Button>

            <p className="text-xs text-muted-foreground mt-4">
              Some features may be available offline
            </p>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Only show persistent banner when there's an issue (but not full modal yet)
  if (isOnline && !isSlowConnection) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center py-3 px-4 text-sm font-semibold shadow-lg safe-area-pt"
        style={{
          backgroundColor: isOnline ? 'hsl(var(--warning))' : 'hsl(var(--destructive))',
          color: 'white',
        }}
      >
        {!isOnline ? (
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 animate-pulse" />
            <span>No Internet Connection</span>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleRetry}
              className="ml-2 h-7 px-3 text-xs bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          </div>
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
