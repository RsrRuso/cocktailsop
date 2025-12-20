import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Wifi, WifiOff, Signal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const NetworkStatusIndicator = () => {
  const { isOnline, isSlowConnection } = useNetworkStatus();

  // Only show indicator when there's an issue
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
