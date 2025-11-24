import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const REACTIONS = ['❤️', '😂', '😮', '😢', '👏', '🔥'];

interface QuickReactionsProps {
  onReact: (emoji: string) => void;
  show: boolean;
  className?: string;
}

export const QuickReactions = ({ onReact, show, className }: QuickReactionsProps) => {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  const handleReact = (emoji: string) => {
    setSelectedEmoji(emoji);
    onReact(emoji);
    setTimeout(() => setSelectedEmoji(null), 1000);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            "absolute bottom-full mb-2 left-1/2 -translate-x-1/2",
            "bg-background/95 backdrop-blur-xl border border-border/50 rounded-full shadow-2xl",
            "px-3 py-2 flex items-center gap-2 z-50",
            className
          )}
        >
          {REACTIONS.map((emoji, index) => (
            <motion.button
              key={emoji}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: index * 0.05, type: 'spring', stiffness: 260, damping: 20 }}
              whileHover={{ scale: 1.3, y: -4 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleReact(emoji)}
              className={cn(
                "text-2xl cursor-pointer transition-all duration-200",
                "hover:drop-shadow-lg active:scale-90",
                selectedEmoji === emoji && "animate-bounce"
              )}
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
