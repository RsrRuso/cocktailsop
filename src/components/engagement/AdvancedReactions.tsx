import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Laugh, ThumbsUp, Star, Flame, Sparkles, PartyPopper, Eye } from 'lucide-react';

interface AdvancedReactionsProps {
  contentId: string;
  onReact: (reaction: string) => void;
  show?: boolean;
}

const REACTION_TYPES = [
  { emoji: '❤️', icon: Heart, label: 'Love', color: 'text-red-500' },
  { emoji: '😂', icon: Laugh, label: 'Haha', color: 'text-yellow-500' },
  { emoji: '👍', icon: ThumbsUp, label: 'Like', color: 'text-blue-500' },
  { emoji: '⭐', icon: Star, label: 'Amazing', color: 'text-purple-500' },
  { emoji: '🔥', icon: Flame, label: 'Fire', color: 'text-orange-500' },
  { emoji: '✨', icon: Sparkles, label: 'Sparkle', color: 'text-pink-500' },
  { emoji: '🎉', icon: PartyPopper, label: 'Celebrate', color: 'text-green-500' },
  { emoji: '👀', icon: Eye, label: 'Wow', color: 'text-cyan-500' },
];

export const AdvancedReactions = ({ onReact, show = true }: AdvancedReactionsProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="flex items-center gap-1 p-2 bg-background/95 backdrop-blur-lg rounded-full border border-border shadow-lg"
        >
          {REACTION_TYPES.map((reaction, index) => (
            <motion.button
              key={reaction.label}
              onHoverStart={() => setHoveredIndex(index)}
              onHoverEnd={() => setHoveredIndex(null)}
              onClick={() => onReact(reaction.emoji)}
              whileHover={{ scale: 1.4, y: -8 }}
              whileTap={{ scale: 0.9 }}
              className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-all ${
                hoveredIndex === index ? 'bg-primary/10' : 'hover:bg-accent'
              }`}
            >
              <span className="text-xl">{reaction.emoji}</span>
              
              <AnimatePresence>
                {hoveredIndex === index && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md whitespace-nowrap shadow-lg border border-border"
                  >
                    {reaction.label}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
