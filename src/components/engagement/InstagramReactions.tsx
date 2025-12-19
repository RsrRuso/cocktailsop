import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_REACTIONS = ['❤️', '🔥', '👏', '😍', '😮', '😢'];

interface InstagramReactionsProps {
  isLiked: boolean;
  onLike: () => void;
  onReaction?: (emoji: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const InstagramReactions = ({ 
  isLiked, 
  onLike, 
  onReaction,
  children, 
  className 
}: InstagramReactionsProps) => {
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [flyingEmoji, setFlyingEmoji] = useState<string | null>(null);
  const lastTapRef = useRef(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  // Double tap to like
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap detected
      if (!isLiked) {
        onLike();
      }
      setShowHeartAnimation(true);
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      setTimeout(() => setShowHeartAnimation(false), 1000);
    }
    lastTapRef.current = now;
  }, [isLiked, onLike]);

  // Long press for reactions
  const handleTouchStart = useCallback(() => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setShowReactions(true);
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([30, 20, 30]);
      }
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    if (!isLongPressRef.current) {
      handleDoubleTap();
    }
  }, [handleDoubleTap]);

  const handleTouchMove = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleReaction = (emoji: string) => {
    setFlyingEmoji(emoji);
    setShowReactions(false);
    onReaction?.(emoji);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
    
    setTimeout(() => setFlyingEmoji(null), 800);
  };

  return (
    <div 
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={() => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
        }
      }}
    >
      {children}
      
      {/* Double tap heart animation */}
      <AnimatePresence>
        {showHeartAnimation && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          >
            <Heart 
              className="w-24 h-24 text-white fill-white drop-shadow-2xl" 
              strokeWidth={1}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flying emoji animation */}
      <AnimatePresence>
        {flyingEmoji && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 0 }}
            animate={{ scale: 1.2, opacity: 1, y: -50 }}
            exit={{ scale: 0.5, opacity: 0, y: -100 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          >
            <span className="text-6xl drop-shadow-2xl">{flyingEmoji}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Long press reactions popup */}
      <AnimatePresence>
        {showReactions && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowReactions(false)}
            />
            
            {/* Reactions bar */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
            >
              <div className="flex items-center gap-2 bg-background/95 backdrop-blur-xl rounded-full px-3 py-2 shadow-2xl border border-white/10">
                {QUICK_REACTIONS.map((emoji, index) => (
                  <motion.button
                    key={emoji}
                    initial={{ scale: 0, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ delay: index * 0.05, type: "spring", damping: 15 }}
                    whileHover={{ scale: 1.3, y: -8 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleReaction(emoji)}
                    className="w-12 h-12 flex items-center justify-center text-3xl hover:bg-white/10 rounded-full transition-colors"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};