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

  // Position picker on left-middle for horizontal scrolling
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Responsive picker dimensions
  const isCompact = viewportWidth < 480;
  const pickerHeight = isCompact ? 64 : 80;

  // Place picker on left side, vertically centered
  const leftPadding = 20;
  const safeX = leftPadding;
  const safeY = viewportHeight / 2;

  // Compute max width for horizontal scrolling
  const horizontalPadding = 40;
  const maxWidth = viewportWidth - horizontalPadding;
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
            // Position from left side, centered vertically
            transform: 'translateY(-50%)',
            touchAction: 'none',
            padding: '8px 10px',
            maxWidth: `${maxWidth}px`,
            background: 'linear-gradient(135deg, hsl(var(--background) / 0.95), hsl(var(--background) / 0.98))',
          }}
        >
          <div className="flex items-center gap-1.5 overflow-x-auto px-0.5 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent" style={{ scrollbarWidth: 'thin' }}>
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
                whileHover={{ scale: 1.1, y: -6 }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(emoji);
                  if ('vibrate' in navigator) {
                    navigator.vibrate(40);
                  }
                }}
                className="relative text-2xl transition-all active:scale-110 touch-manipulation cursor-pointer select-none min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-primary/10 flex-shrink-0"
                style={{
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
                }}
              >
                <span className="relative z-10 leading-none">{emoji}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
});

EmojiReactionPicker.displayName = 'EmojiReactionPicker';
