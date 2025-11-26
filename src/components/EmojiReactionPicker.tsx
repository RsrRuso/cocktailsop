import { motion, AnimatePresence } from 'framer-motion';
import { memo } from 'react';

interface EmojiReactionPickerProps {
  show: boolean;
  onSelect: (emoji: string) => void;
  position: { x: number; y: number };
}

const EMOJIS = ['❤️', '😂', '😮', '😢', '🙏', '👍', '🔥', '🎉'];

export const EmojiReactionPicker = memo(({ show, onSelect, position }: EmojiReactionPickerProps) => {
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.5, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.5, opacity: 0, y: 10 }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 25,
          mass: 0.5
        }}
        className="fixed z-[100] bg-background/95 backdrop-blur-xl border-2 border-primary/30 rounded-full px-4 py-3 shadow-2xl"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -100%)',
          touchAction: 'none',
        }}
      >
        <div className="flex items-center gap-3">
          {EMOJIS.map((emoji, index) => (
            <motion.button
              key={emoji}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                delay: index * 0.04,
                type: "spring",
                stiffness: 500,
                damping: 20
              }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(emoji);
                // Haptic feedback
                if ('vibrate' in navigator) {
                  navigator.vibrate(30);
                }
              }}
              className="text-3xl sm:text-4xl hover:drop-shadow-2xl transition-all active:scale-90 touch-manipulation cursor-pointer select-none min-w-[44px] min-h-[44px] flex items-center justify-center"
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
