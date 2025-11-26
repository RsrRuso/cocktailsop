import { motion, AnimatePresence } from 'framer-motion';
import { memo } from 'react';

interface EmojiReactionPickerProps {
  show: boolean;
  onSelect: (emoji: string) => void;
  position: { x: number; y: number };
}

const EMOJIS = ['❤️', '😂', '😮', '😢', '😍', '🙏', '👍', '🔥'];

export const EmojiReactionPicker = memo(({ show, onSelect, position }: EmojiReactionPickerProps) => {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.3, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.3, opacity: 0, y: 20 }}
        transition={{ 
          type: "spring", 
          stiffness: 500, 
          damping: 30,
        }}
        className="fixed z-[100] bg-background/98 backdrop-blur-xl border-2 border-primary/20 rounded-full shadow-2xl"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -100%)',
          touchAction: 'none',
          padding: '12px 16px',
        }}
      >
        <div className="flex items-center gap-2">
          {EMOJIS.map((emoji, index) => (
            <motion.button
              key={emoji}
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ 
                delay: index * 0.03,
                type: "spring",
                stiffness: 600,
                damping: 25
              }}
              whileTap={{ scale: 1.3 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(emoji);
                // Haptic feedback
                if ('vibrate' in navigator) {
                  navigator.vibrate(40);
                }
              }}
              className="relative text-4xl transition-transform active:scale-125 touch-manipulation cursor-pointer select-none min-w-[48px] min-h-[48px] flex items-center justify-center hover:scale-110"
              style={{
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
              }}
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

EmojiReactionPicker.displayName = 'EmojiReactionPicker';
