import { memo, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CommunityMessageBubble } from "./CommunityMessageBubble";
import { MessageCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface Message {
  id: string;
  user_id: string;
  content: string | null;
  created_at: string;
  reactions: Record<string, string[]>;
  profile?: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
  reply_message?: Message | null;
  optimistic?: boolean;
  sending?: boolean;
  failed?: boolean;
}

interface CommunityMessageListProps {
  messages: Message[];
  userId: string;
  loading: boolean;
  onReply: (message: Message) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onRetry: (messageId: string) => void;
}

function CommunityMessageListComponent({
  messages,
  userId,
  loading,
  onReply,
  onReaction,
  onRetry,
}: CommunityMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessagesLengthRef = useRef(messages.length);

  // Check if user is near bottom
  const checkNearBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;
    
    const threshold = 100;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  // Auto-scroll on new messages (if near bottom)
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      if (isNearBottomRef.current) {
        // Instant scroll for own messages, smooth for others
        const lastMessage = messages[messages.length - 1];
        const isOwn = lastMessage?.user_id === userId;
        
        scrollRef.current?.scrollIntoView({
          behavior: isOwn ? "auto" : "smooth",
          block: "end",
        });
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, userId]);

  // Initial scroll to bottom
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      scrollRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }
  }, [loading]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    isNearBottomRef.current = checkNearBottom();
  }, [checkNearBottom]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-white/30" />
          </div>
          <p className="text-white/40 text-sm">No messages yet</p>
          <p className="text-white/30 text-xs mt-1">Be the first to say hi!</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto overscroll-contain"
      onScroll={handleScroll}
      style={{ 
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(255,255,255,0.1) transparent",
      }}
    >
      <div className="p-3 space-y-2 max-w-4xl mx-auto">
        {messages.map((message, idx) => {
          const isOwn = message.user_id === userId;
          const prevMessage = messages[idx - 1];
          const showAvatar = !prevMessage || 
            prevMessage.user_id !== message.user_id ||
            new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 60000;

          return (
            <CommunityMessageBubble
              key={message.id}
              message={message}
              isOwn={isOwn}
              showAvatar={showAvatar}
              userId={userId}
              onReply={onReply}
              onReaction={onReaction}
              onRetry={onRetry}
            />
          );
        })}
        <div ref={scrollRef} className="h-1" />
      </div>
    </div>
  );
}

export const CommunityMessageList = memo(CommunityMessageListComponent);
