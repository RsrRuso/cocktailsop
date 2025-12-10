import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

// Extended emoji collection with many more options
const EMOJI_CATEGORIES = {
  reactions: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💗', '💖'],
  faces: ['😍', '🥰', '😘', '😂', '🤣', '😭', '🥺', '😢', '😮', '😱', '🤯', '😎', '🤩', '🥳'],
  gestures: ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤟', '💪', '👊', '✊'],
  fire: ['🔥', '⚡', '💥', '✨', '🌟', '⭐', '💫', '🎉', '🎊', '🏆', '👑', '💎'],
  food: ['🍕', '🍔', '🍟', '🍿', '🧁', '🍩', '☕', '🍺', '🍷', '🥂', '🍸', '🍹'],
  misc: ['💯', '🎵', '🎶', '🚀', '💻', '🌈', '🦋', '🦄']
};

const ALL_EMOJIS = Object.values(EMOJI_CATEGORIES).flat();

interface QuickReactionsProps {
  onReact: (emoji: string) => void;
  show: boolean;
  className?: string;
}

export const QuickReactions = ({ onReact, show, className }: QuickReactionsProps) => {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleReact = (emoji: string) => {
    setSelectedEmoji(emoji);
    onReact(emoji);
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
    setTimeout(() => setSelectedEmoji(null), 800);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            "absolute bottom-full mb-3 left-1/2 -translate-x-1/2",
            "rounded-2xl shadow-2xl z-50 overflow-hidden",
            "max-w-[90vw] w-[340px]",
            className
          )}
          style={{
            background: 'linear-gradient(145deg, hsl(var(--background) / 0.98), hsl(var(--background) / 0.95))',
            border: '1px solid hsl(var(--border) / 0.3)',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px hsl(var(--primary) / 0.1)',
          }}
        >
          {/* Decorative gradient bar */}
          <div className="h-0.5 w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500" />
          
          {/* Scrollable emoji container */}
          <div 
            ref={scrollRef}
            className="overflow-x-auto overflow-y-hidden px-2 py-3 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
            style={{ 
              scrollbarWidth: 'thin',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div className="flex items-center gap-0.5 min-w-max">
              {ALL_EMOJIS.map((emoji, index) => (
                <motion.button
                  key={emoji}
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    delay: Math.min(index * 0.015, 0.4), 
                    type: 'spring', 
                    stiffness: 350, 
                    damping: 18 
                  }}
                  whileHover={{ scale: 1.25, y: -5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleReact(emoji)}
                  className={cn(
                    "text-xl cursor-pointer transition-all duration-150",
                    "min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg",
                    "hover:bg-primary/10 active:bg-primary/20 flex-shrink-0",
                    "hover:drop-shadow-lg active:scale-90",
                    selectedEmoji === emoji && "animate-bounce bg-primary/20"
                  )}
                  aria-label={`React with ${emoji}`}
                >
                  <span className="text-[22px] leading-none">{emoji}</span>
                </motion.button>
              ))}
            </div>
          </div>
          
          {/* Scroll hint gradients */}
          <div className="pointer-events-none absolute top-[2px] left-0 w-6 h-[calc(100%-2px)] bg-gradient-to-r from-background/80 to-transparent" />
          <div className="pointer-events-none absolute top-[2px] right-0 w-6 h-[calc(100%-2px)] bg-gradient-to-l from-background/80 to-transparent" />
          
          {/* Bottom hint */}
          <div className="px-3 py-1.5 border-t border-border/10 flex justify-center">
            <p className="text-[9px] text-muted-foreground/50">← swipe for more →</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
