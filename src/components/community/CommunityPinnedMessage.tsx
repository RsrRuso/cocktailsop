import { memo } from "react";
import { Pin, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface PinnedMessage {
  id: string;
  content: string | null;
  user_id: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

interface CommunityPinnedMessageProps {
  messages: PinnedMessage[];
  currentIndex: number;
  onNavigate: () => void;
  onDismiss: () => void;
  onUnpin?: (messageId: string) => void;
  canUnpin?: boolean;
}

function CommunityPinnedMessageComponent({
  messages,
  currentIndex,
  onNavigate,
  onDismiss,
  onUnpin,
  canUnpin,
}: CommunityPinnedMessageProps) {
  if (messages.length === 0) return null;

  const currentMessage = messages[currentIndex % messages.length];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="border-b border-white/10 bg-slate-800/60 backdrop-blur-sm overflow-hidden"
      >
        <div 
          className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={onNavigate}
        >
          {/* Pin indicator with count */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-1 h-8 bg-blue-500 rounded-full" />
            <Pin className="w-4 h-4 text-blue-400" />
            {messages.length > 1 && (
              <span className="text-[10px] font-medium text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded-full">
                {currentIndex + 1}/{messages.length}
              </span>
            )}
          </div>

          {/* Message content */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-blue-400">
              Pinned Message
            </p>
            <p className="text-sm text-white/70 truncate">
              {currentMessage?.content || "Media message"}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {messages.length > 1 && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate();
                }}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            )}
            {canUnpin && onUnpin && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnpin(currentMessage.id);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export const CommunityPinnedMessage = memo(CommunityPinnedMessageComponent);
