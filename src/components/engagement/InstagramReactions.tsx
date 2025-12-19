import { useState, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_REACTIONS = ['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '🎉'];

interface InstagramReactionsProps {
  isLiked: boolean;
  onLike: () => void;
  onReaction?: (emoji: string) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

// Lightweight heart burst particles
const HeartBurst = memo(() => (
  <div className="absolute inset-0 pointer-events-none z-30">
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ 
          scale: 0, 
          x: 0, 
          y: 0,
          opacity: 1 
        }}
        animate={{ 
          scale: [0, 1, 0.5],
          x: Math.cos((i * 60) * Math.PI / 180) * 60,
          y: Math.sin((i * 60) * Math.PI / 180) * 60,
          opacity: [1, 1, 0]
        }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <Heart className="w-4 h-4 text-red-500 fill-red-500" />
      </motion.div>
    ))}
  </div>
));

HeartBurst.displayName = 'HeartBurst';

export const InstagramReactions = memo(({ 
  isLiked, 
  onLike, 
  onReaction,
  children, 
  className,
  disabled = false
}: InstagramReactionsProps) => {
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [flyingEmoji, setFlyingEmoji] = useState<string | null>(null);
  const [ripplePos, setRipplePos] = useState<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Haptic feedback helper
  const haptic = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Double tap to like with position-aware ripple
  const handleDoubleTap = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Get tap position for ripple effect
      if (e && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.changedTouches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.changedTouches[0].clientY : e.clientY;
        setRipplePos({
          x: ((clientX - rect.left) / rect.width) * 100,
          y: ((clientY - rect.top) / rect.height) * 100
        });
      }

      if (!isLiked) {
        onLike();
      }
      
      setShowHeartAnimation(true);
      setShowBurst(true);
      haptic([25, 25, 25]);
      
      setTimeout(() => {
        setShowHeartAnimation(false);
        setShowBurst(false);
        setRipplePos(null);
      }, 800);
    }
    lastTapRef.current = now;
  }, [isLiked, onLike, haptic, disabled]);

  // Long press for reactions
  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return;
    isLongPressRef.current = false;
    
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setShowReactions(true);
      haptic([20, 30, 20]);
    }, 400);
  }, [haptic, disabled]);

  const handleTouchEnd = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    if (!isLongPressRef.current && !disabled) {
      handleDoubleTap(e);
    }
  }, [handleDoubleTap, disabled]);

  const handleTouchMove = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleReaction = useCallback((emoji: string) => {
    setFlyingEmoji(emoji);
    setShowReactions(false);
    onReaction?.(emoji);
    haptic(15);
    
    setTimeout(() => setFlyingEmoji(null), 600);
  }, [onReaction, haptic]);

  return (
    <div 
      ref={containerRef}
      className={cn("relative select-none", className)}
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
      
      {/* Ripple effect at tap position */}
      <AnimatePresence>
        {ripplePos && (
          <motion.div
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute w-20 h-20 rounded-full bg-white/20 pointer-events-none z-20"
            style={{ 
              left: `${ripplePos.x}%`, 
              top: `${ripplePos.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        )}
      </AnimatePresence>

      {/* Main heart animation */}
      <AnimatePresence>
        {showHeartAnimation && (
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -15 }}
            animate={{ scale: [0, 1.2, 1], opacity: 1, rotate: 0 }}
            exit={{ scale: 1.3, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          >
            <Heart 
              className="w-20 h-20 text-white fill-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" 
              strokeWidth={0}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Heart burst particles */}
      <AnimatePresence>
        {showBurst && <HeartBurst />}
      </AnimatePresence>

      {/* Flying emoji animation */}
      <AnimatePresence>
        {flyingEmoji && (
          <motion.div
            initial={{ scale: 0.3, opacity: 0, y: 0, rotate: -10 }}
            animate={{ 
              scale: [0.3, 1.4, 1.2], 
              opacity: [0, 1, 0], 
              y: -80,
              rotate: [-10, 5, 0]
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          >
            <span className="text-5xl drop-shadow-xl">{flyingEmoji}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Long press reactions popup */}
      <AnimatePresence>
        {showReactions && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setShowReactions(false)}
            />
            
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
            >
              <div className="flex items-center gap-0.5 bg-black/80 backdrop-blur-xl rounded-full px-1 py-1 shadow-2xl">
                {QUICK_REACTIONS.map((emoji, index) => (
                  <motion.button
                    key={emoji}
                    initial={{ scale: 0, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ 
                      delay: index * 0.02, 
                      type: "spring", 
                      damping: 15,
                      stiffness: 500
                    }}
                    whileHover={{ scale: 1.3, y: -6 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleReaction(emoji)}
                    className="w-10 h-10 flex items-center justify-center text-[22px] rounded-full transition-all active:bg-white/10"
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
});

InstagramReactions.displayName = 'InstagramReactions';