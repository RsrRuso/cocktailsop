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

  // Calculate safe positioning to prevent cutoff
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  
  // Emoji picker dimensions (approximate)
  const pickerWidth = EMOJIS.length * 56; // 48px emoji + 8px gap
  const pickerHeight = 80;
  
  // Calculate safe position
  let safeX = position.x;
  let safeY = position.y;
  
  // Prevent horizontal overflow
  const leftEdge = pickerWidth / 2 + 20;
  const rightEdge = viewportWidth - (pickerWidth / 2) - 20;
  safeX = Math.max(leftEdge, Math.min(safeX, rightEdge));
  
  // Prevent vertical overflow
  if (safeY < pickerHeight + 20) {
    safeY = position.y + 100; // Position below instead
  }

  return (
    <>
      {/* Backdrop to close picker */}
      <div
        className="fixed inset-0 z-[99]"
        onClick={() => onSelect('')}
        style={{ touchAction: 'none' }}
      />
      
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
          className="fixed z-[100] glass backdrop-blur-3xl border-2 border-primary/30 rounded-full shadow-2xl"
          style={{
            left: `${safeX}px`,
            top: `${safeY}px`,
            transform: 'translate(-50%, -100%)',
            touchAction: 'none',
            padding: '10px 14px',
            background: 'linear-gradient(135deg, hsl(var(--background) / 0.95), hsl(var(--background) / 0.98))',
          }}
        >
          <div className="flex items-center gap-1.5">
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
                whileTap={{ scale: 1.4 }}
                whileHover={{ scale: 1.15, y: -8 }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(emoji);
                  if ('vibrate' in navigator) {
                    navigator.vibrate(40);
                  }
                }}
                className="relative text-3xl transition-all active:scale-125 touch-manipulation cursor-pointer select-none min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-primary/10"
                style={{
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
                }}
              >
                <span className="relative z-10">{emoji}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
});

EmojiReactionPicker.displayName = 'EmojiReactionPicker';
