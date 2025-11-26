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
        className="fixed z-[100] glass backdrop-blur-xl border border-primary/20 rounded-full px-3 py-2 shadow-2xl"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: 'translate(-50%, -100%)',
        }}
      >
        <div className="flex items-center gap-2">
          {EMOJIS.map((emoji, index) => (
            <motion.button
              key={emoji}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                delay: index * 0.05,
                type: "spring",
                stiffness: 500,
                damping: 20
              }}
              whileHover={{ scale: 1.3, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                onSelect(emoji);
                // Haptic feedback
                if ('vibrate' in navigator) {
                  navigator.vibrate(30);
                }
              }}
              className="text-2xl sm:text-3xl hover:drop-shadow-lg transition-all active:scale-90 touch-manipulation"
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
