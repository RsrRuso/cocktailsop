import { useEffect, useRef, useState } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Wifi, WifiOff, Signal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export const NetworkStatusIndicator = () => {
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const prevOnlineRef = useRef(isOnline);
  const hasShownOfflineRef = useRef(false);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Show toast notification INSTANTLY when connection goes down
  useEffect(() => {
    // Offline detection - instant and prominent
    if (!isOnline && !hasShownOfflineRef.current) {
      hasShownOfflineRef.current = true;
      setShowBanner(true);
      setBannerDismissed(false);
    }
    
    // Back online - dismiss and show success
    if (isOnline && prevOnlineRef.current === false) {
      hasShownOfflineRef.current = false;
      setShowBanner(false);
      setBannerDismissed(false);
      toast.success("Back online", {
        description: "Connection restored",
        icon: <Wifi className="w-5 h-5" />,
        duration: 2000,
      });
    }
    
    // Slow connection - show banner
    if (isOnline && isSlowConnection && !bannerDismissed) {
      setShowBanner(true);
    }
    
    prevOnlineRef.current = isOnline;
  }, [isOnline, isSlowConnection, bannerDismissed]);

  const handleDismiss = () => {
    setBannerDismissed(true);
    setShowBanner(false);
  };

  // Don't show banner if dismissed or no issues
  if (!showBanner || (isOnline && !isSlowConnection)) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.95 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center py-3 px-4 text-sm font-semibold shadow-lg"
        style={{
          backgroundColor: isOnline ? 'hsl(45, 93%, 47%)' : 'hsl(0, 84%, 60%)',
          color: 'white',
        }}
      >
        <div className="flex items-center justify-center flex-1">
          {!isOnline ? (
            <>
              <WifiOff className="w-5 h-5 mr-2 animate-pulse" />
              <div className="text-center">
                <span className="font-bold">No Internet Connection</span>
                <p className="text-xs opacity-90 mt-0.5">Check your connection and try again</p>
              </div>
            </>
          ) : (
            <>
              <Signal className="w-5 h-5 mr-2" />
              <div className="text-center">
                <span className="font-bold">Slow Connection</span>
                <p className="text-xs opacity-90 mt-0.5">Loading may take longer than usual</p>
              </div>
            </>
          )}
        </div>
        {isOnline && isSlowConnection && (
          <button
            onClick={handleDismiss}
            className="absolute right-3 p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
