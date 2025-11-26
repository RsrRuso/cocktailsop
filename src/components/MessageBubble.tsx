import { Message } from '@/hooks/useMessageThread';
import { Check, CheckCheck, Reply, Trash2, Forward, Heart, Edit, MoreVertical, Copy } from 'lucide-react';
import { LazyImage } from './LazyImage';
import { VoiceWaveform } from './VoiceWaveform';
import { useState, useRef, useEffect, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  replyMessage?: Message | null;
  onReply: (message: Message) => void;
  onDelete?: () => void;
  onForward?: () => void;
  onLike?: () => void;
  onEdit?: () => void;
  children?: React.ReactNode;
}

export const MessageBubble = memo(({
  message,
  isOwn,
  replyMessage,
  onReply,
  onDelete,
  onForward,
  onLike,
  onEdit,
  children,
}: MessageBubbleProps) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const longPressTimer = useRef<NodeJS.Timeout>();
  const bubbleRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    setIsSwiping(true);
    
    // Long press for dropdown
    longPressTimer.current = setTimeout(() => {
      setShowDropdown(true);
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;
    
    // Clear long press timer if moved
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - touchStartX.current;
    const deltaY = touchY - touchStartY.current;

    // Only allow horizontal swipe if it's more horizontal than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
      
      // Limit swipe distance
      const maxSwipe = 120;
      const newOffset = Math.max(Math.min(deltaX, maxSwipe), -maxSwipe);
      
      // Allow swipe in both directions for different actions
      setSwipeOffset(newOffset);
    }
  }, [isSwiping]);

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false);
    
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    
    // Detect double tap for like
    const tapDuration = Date.now() - touchStartTime.current;
    if (tapDuration < 300 && Math.abs(swipeOffset) < 10) {
      if (tapDuration < 200) {
        setShowLikeAnimation(true);
        onLike?.();
        setTimeout(() => setShowLikeAnimation(false), 1000);
      }
    }
    
    // If swiped enough, trigger action
    if (Math.abs(swipeOffset) > 60) {
      if (swipeOffset > 0) {
        // Right swipe - Reply
        onReply(message);
      } else {
        // Left swipe - Forward/Delete
        if (isOwn) {
          setShowDropdown(true);
        } else {
          onForward?.();
        }
      }
      setTimeout(() => setSwipeOffset(0), 300);
    } else {
      setSwipeOffset(0);
    }
  }, [swipeOffset, onReply, onForward, onLike, message, isOwn]);

  useEffect(() => {
    // Reset swipe when message changes
    setSwipeOffset(0);
  }, [message.id]);

  const shouldShowActions = Math.abs(swipeOffset) > 30;

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} relative`}>
      {/* Swipe action indicators - Simplified */}
      <AnimatePresence>
        {Math.abs(swipeOffset) > 30 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute ${swipeOffset > 0 ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 z-0`}
          >
            {swipeOffset > 0 ? (
              <div className="flex items-center gap-2 bg-primary/20 rounded-full px-3 py-1">
                <Reply className="w-4 h-4 text-primary" />
              </div>
            ) : isOwn ? (
              <div className="flex items-center gap-2">
                <div className="rounded-full p-1.5 bg-destructive/20">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </div>
              </div>
            ) : (
              <div className="bg-muted rounded-full px-3 py-1">
                <Forward className="w-4 h-4" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        ref={bubbleRef}
        id={`message-${message.id}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
        className={`relative group max-w-[75%] z-10 ${
          message.media_url && (message.media_type === 'image' || message.media_type === 'video')
            ? ''
            : 'bg-muted px-3 py-2'
        } rounded-xl ${isOwn ? '' : ''}`}
      >
        {/* Like Animation Overlay - Simplified */}
        <AnimatePresence>
          {showLikeAnimation && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
            >
              <Heart className="w-16 h-16 fill-red-500 text-red-500" />
            </motion.div>
          )}
        </AnimatePresence>
        {message.reply_to_id && replyMessage && (
          <div
            className={`${
              message.media_url && (message.media_type === 'image' || message.media_type === 'video')
                ? 'px-3 pt-2'
                : ''
            } mb-2 p-2 bg-muted rounded-lg text-xs border-l-2 border-primary cursor-pointer`}
            onClick={() => onReply(replyMessage)}
          >
            <p className="font-semibold">Replying to</p>
            <p className="truncate">{replyMessage.content}</p>
          </div>
        )}

        {message.media_url && message.media_type === 'image' && (
          <LazyImage
            src={message.media_url}
            alt="Shared image"
            className="w-full max-w-sm rounded-t-2xl"
          />
        )}

        {message.media_url && message.media_type === 'video' && (
          <video src={message.media_url} controls className="w-full max-w-sm rounded-t-2xl" />
        )}

        {message.media_url && message.media_type === 'voice' && (
          <div className="px-2 py-2">
            <VoiceWaveform audioUrl={message.media_url} />
          </div>
        )}

        {message.media_url && message.media_type === 'document' && (
          <div className="flex items-center gap-2">
            <a
              href={message.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              📎 View Document
            </a>
          </div>
        )}

        {(message as any).forwarded && (
          <div className={`${
            message.media_url && (message.media_type === 'image' || message.media_type === 'video')
              ? 'px-4 pt-2'
              : ''
          } flex items-center gap-1 text-xs text-muted-foreground mb-1`}>
            <Forward className="w-3 h-3" />
            <span>Forwarded</span>
          </div>
        )}

        <p
          className={`${
            message.media_url && (message.media_type === 'image' || message.media_type === 'video')
              ? 'px-3 pt-2'
              : ''
          } break-words whitespace-pre-wrap ${message.edited ? 'italic' : ''}`}
        >
          {message.content}
          {message.edited && <span className="text-xs opacity-50 ml-2">(edited)</span>}
        </p>

        <div
          className={`${
            message.media_url && (message.media_type === 'image' || message.media_type === 'video')
              ? 'px-3 pb-2'
              : ''
          } flex items-center justify-between gap-2 mt-1`}
        >
          <span className="text-xs opacity-70">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {isOwn && (
            <div className="flex items-center gap-1" title={message.read ? 'Read' : message.delivered ? 'Delivered' : 'Sent'}>
              {message.read ? (
                <CheckCheck className="w-3 h-3 text-emerald-500" />
              ) : message.delivered ? (
                <CheckCheck className="w-3 h-3 text-muted-foreground" />
              ) : (
                <Check className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
          )}
        </div>

        {children}
      </motion.div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.read === nextProps.message.read &&
    prevProps.message.delivered === nextProps.message.delivered &&
    prevProps.message.edited === nextProps.message.edited &&
    JSON.stringify(prevProps.message.reactions) === JSON.stringify(nextProps.message.reactions) &&
    prevProps.isOwn === nextProps.isOwn
  );
});
