import { motion, AnimatePresence } from 'framer-motion';
import { memo, useRef } from 'react';
import { cn } from '@/lib/utils';

interface EmojiReactionPickerProps {
  show: boolean;
  onSelect: (emoji: string) => void;
  position: { x: number; y: number };
}

// Extended emoji collection with many more options
const EMOJI_CATEGORIES = {
  reactions: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💗', '💖', '💕', '💓', '💝'],
  faces: ['😍', '🥰', '😘', '😂', '🤣', '😭', '🥺', '😢', '😮', '😱', '🤯', '😎', '🤩', '🥳', '😇', '🙏'],
  gestures: ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤟', '🤙', '💪', '👊', '✊', '🤜', '🤛', '☝️'],
  fire: ['🔥', '⚡', '💥', '✨', '🌟', '⭐', '💫', '🎉', '🎊', '🎁', '🏆', '👑', '💎', '💰'],
  food: ['🍕', '🍔', '🍟', '🌮', '🍿', '🧁', '🍩', '🍪', '🍰', '🎂', '🍫', '🍬', '☕', '🍺', '🍷', '🥂', '🍸', '🍹'],
  nature: ['🌈', '🌸', '🌺', '🌻', '🌹', '🍀', '🌴', '🌊', '🌙', '☀️', '🦋', '🐝', '🦄'],
  misc: ['💯', '💢', '💤', '💨', '🎵', '🎶', '🎤', '🎧', '📸', '🎬', '🚀', '💻', '📱']
};

const ALL_EMOJIS = Object.values(EMOJI_CATEGORIES).flat();

export const EmojiReactionPicker = memo(({ show, onSelect, position }: EmojiReactionPickerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  if (!show) return null;

  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 400;

  // Center horizontally, position in middle-lower area of screen
  const pickerWidth = Math.min(viewportWidth - 32, 380);
  const safeX = (viewportWidth - pickerWidth) / 2;
  const safeY = viewportHeight * 0.45;

  return (
    <>
      {/* Backdrop with blur effect */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99] bg-background/40 backdrop-blur-sm"
        onClick={() => onSelect('')}
        style={{ touchAction: 'none' }}
      />
      
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0, y: 30 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25,
          }}
          className="fixed z-[100] rounded-3xl shadow-2xl overflow-hidden"
          style={{
            left: `${safeX}px`,
            top: `${safeY}px`,
            width: `${pickerWidth}px`,
            touchAction: 'none',
            background: 'linear-gradient(145deg, hsl(var(--background) / 0.98), hsl(var(--background) / 0.95))',
            border: '1px solid hsl(var(--border) / 0.3)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px hsl(var(--primary) / 0.1)',
          }}
        >
          {/* Decorative gradient bar */}
          <div className="h-1 w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500" />
          
          {/* Header */}
          <div className="px-4 py-2 border-b border-border/20">
            <p className="text-xs text-muted-foreground font-medium text-center">React with emoji</p>
          </div>
          
          {/* Scrollable emoji container */}
          <div 
            ref={scrollRef}
            className="overflow-x-auto overflow-y-hidden px-3 py-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
            style={{ 
              scrollbarWidth: 'thin',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <div className="flex items-center gap-1 min-w-max">
              {ALL_EMOJIS.map((emoji, index) => (
                <motion.button
                  key={`${emoji}-${index}`}
                  initial={{ scale: 0, y: 15 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ 
                    delay: Math.min(index * 0.01, 0.3),
                    type: "spring",
                    stiffness: 500,
                    damping: 20
                  }}
                  whileTap={{ scale: 1.4 }}
                  whileHover={{ scale: 1.2, y: -4 }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(emoji);
                    if ('vibrate' in navigator) {
                      navigator.vibrate(30);
                    }
                  }}
                  className={cn(
                    "relative text-2xl transition-all active:scale-125 touch-manipulation cursor-pointer select-none",
                    "min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl",
                    "hover:bg-primary/10 active:bg-primary/20 flex-shrink-0"
                  )}
                  style={{
                    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))',
                  }}
                >
                  <span className="relative z-10 leading-none text-[26px]">{emoji}</span>
                </motion.button>
              ))}
            </div>
          </div>
          
          {/* Scroll hint gradient overlays */}
          <div className="pointer-events-none absolute top-[52px] left-0 w-8 h-[calc(100%-52px)] bg-gradient-to-r from-background/80 to-transparent" />
          <div className="pointer-events-none absolute top-[52px] right-0 w-8 h-[calc(100%-52px)] bg-gradient-to-l from-background/80 to-transparent" />
          
          {/* Bottom hint */}
          <div className="px-4 py-2 border-t border-border/20 flex justify-center">
            <p className="text-[10px] text-muted-foreground/60">← Swipe for more →</p>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
});

EmojiReactionPicker.displayName = 'EmojiReactionPicker';
