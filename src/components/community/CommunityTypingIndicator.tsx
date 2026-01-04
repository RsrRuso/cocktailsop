import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TypingUser {
  userId: string;
  username: string;
}

interface CommunityTypingIndicatorProps {
  typingUsers: TypingUser[];
}

function CommunityTypingIndicatorComponent({ typingUsers }: CommunityTypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].username} is typing`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].username} and ${typingUsers[1].username} are typing`;
    } else {
      return `${typingUsers[0].username} and ${typingUsers.length - 1} others are typing`;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.15 }}
        className="flex items-center gap-2 px-4 py-1.5"
      >
        {/* Animated dots */}
        <div className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 bg-blue-400 rounded-full"
              animate={{
                y: [0, -4, 0],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                delay: i * 0.1,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
        <span className="text-xs text-white/50">{getTypingText()}</span>
      </motion.div>
    </AnimatePresence>
  );
}

export const CommunityTypingIndicator = memo(CommunityTypingIndicatorComponent);
