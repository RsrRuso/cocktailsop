import { Message } from '@/hooks/useMessageThread';
import { Check, CheckCheck, Reply, Trash2, Forward, Heart, Edit, MoreVertical, Copy } from 'lucide-react';
import { LazyImage } from './LazyImage';
import { VoiceWaveform } from './VoiceWaveform';
import { useState, useRef, useEffect, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmojiReactionPicker } from './EmojiReactionPicker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  replyMessage?: Message | null;
  onReply: (message: Message) => void;
  onDelete?: () => void;
  onForward?: () => void;
  onLike?: () => void;
  onEdit?: () => void;
  onReaction?: (emoji: string) => void;
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
  onReaction,
  children,
}: MessageBubbleProps) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ x: 0, y: 0 });
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const lastTapTime = useRef(0);
  const longPressTimer = useRef<NodeJS.Timeout>();
  const bubbleRef = useRef<HTMLDivElement>(null);
  const hasMoved = useRef(false);
  const tapCount = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    setIsSwiping(true);
    hasMoved.current = false;
    
    // Long press for emoji picker (500ms - Instagram timing)
    longPressTimer.current = setTimeout(() => {
      if (!hasMoved.current) {
        const rect = bubbleRef.current?.getBoundingClientRect();
        if (rect) {
          setEmojiPickerPosition({
            x: rect.left + rect.width / 2,
            y: rect.top - 20,
          });
          setShowEmojiPicker(true);
          setIsSwiping(false);
          // Strong haptic feedback
          if ('vibrate' in navigator) {
            navigator.vibrate([50, 30, 50]);
          }
        }
      }
    }, 500);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - touchStartX.current;
    const deltaY = touchY - touchStartY.current;

    // Mark as moved if significant movement
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      hasMoved.current = true;
      // Clear long press timer if moved
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    }

    // Only allow horizontal swipe if it's more horizontal than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 15) {
      e.preventDefault();
      
      // Limit swipe distance
      const maxSwipe = 100;
      const newOffset = Math.max(Math.min(deltaX, maxSwipe), -maxSwipe);
      
      setSwipeOffset(newOffset);
    }
  }, [isSwiping]);

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false);
    
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    
    const now = Date.now();
    const touchDuration = now - touchStartTime.current;
    
    // Double tap detection for quick heart reaction (Instagram style)
    if (!hasMoved.current && touchDuration < 300 && Math.abs(swipeOffset) < 10) {
      const timeSinceLastTap = now - lastTapTime.current;
      
      if (timeSinceLastTap < 400) {
        // Double tap detected - quick heart reaction
        setSelectedEmoji('❤️');
        onReaction?.('❤️');
        setShowLikeAnimation(true);
        
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([30, 20, 30]);
        }
        
        setTimeout(() => {
          setShowLikeAnimation(false);
          setSelectedEmoji(null);
        }, 1000);
        
        tapCount.current = 0;
      } else {
        // First tap
        tapCount.current = 1;
      }
      
      lastTapTime.current = now;
    }
    
    // If swiped enough, trigger action
    if (Math.abs(swipeOffset) > 50) {
      if (swipeOffset > 0) {
        // Right swipe - Reply
        onReply(message);
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(40);
        }
      } else {
        // Left swipe - Forward
        onForward?.();
        // Haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(40);
        }
      }
    }
    
    // Reset swipe
    setTimeout(() => setSwipeOffset(0), 200);
  }, [swipeOffset, onReply, onForward, onReaction, message]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setSelectedEmoji(emoji);
    setShowEmojiPicker(false);
    onReaction?.(emoji);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    // Show quick animation
    setShowLikeAnimation(true);
    setTimeout(() => {
      setShowLikeAnimation(false);
      setSelectedEmoji(null);
    }, 1200);
  }, [onReaction]);

  useEffect(() => {
    // Reset swipe when message changes
    setSwipeOffset(0);
  }, [message.id]);

  const shouldShowActions = Math.abs(swipeOffset) > 30;

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} relative`}>
      {/* Emoji Reaction Picker - Backdrop to close */}
      {showEmojiPicker && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99] bg-black/20 backdrop-blur-sm" 
          onClick={() => setShowEmojiPicker(false)}
          onTouchStart={() => setShowEmojiPicker(false)}
        />
      )}
      
      {/* Emoji Reaction Picker */}
      <EmojiReactionPicker
        show={showEmojiPicker}
        onSelect={handleEmojiSelect}
        position={emojiPickerPosition}
      />

      {/* Edit/Delete Menu - Long press alternative */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDropdown(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass backdrop-blur-xl rounded-2xl p-4 m-4 max-w-xs w-full border border-primary/20 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                {isOwn && onEdit && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-12 hover:bg-primary/10"
                    onClick={() => {
                      onEdit();
                      setShowDropdown(false);
                    }}
                  >
                    <Edit className="w-5 h-5 text-primary" />
                    <span className="text-base">Edit Message</span>
                  </Button>
                )}
                {onForward && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-12 hover:bg-accent/10"
                    onClick={() => {
                      onForward();
                      setShowDropdown(false);
                    }}
                  >
                    <Forward className="w-5 h-5 text-accent-foreground" />
                    <span className="text-base">Forward Message</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-12 hover:bg-primary/10"
                  onClick={() => {
                    navigator.clipboard.writeText(message.content);
                    setShowDropdown(false);
                  }}
                >
                  <Copy className="w-5 h-5" />
                  <span className="text-base">Copy Text</span>
                </Button>
                {isOwn && onDelete && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-12 hover:bg-destructive/10 text-destructive"
                    onClick={() => {
                      onDelete();
                      setShowDropdown(false);
                    }}
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="text-base">Delete Message</span>
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swipe action indicators */}
      <AnimatePresence>
        {Math.abs(swipeOffset) > 30 && !showDropdown && !showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute ${swipeOffset > 0 ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2 z-0`}
          >
            {swipeOffset > 0 ? (
              <div className="flex items-center gap-2 backdrop-blur-lg rounded-full px-3 py-2 bg-primary/20 border border-primary/30">
                <Reply className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="text-xs sm:text-sm font-medium text-primary">Reply</span>
              </div>
            ) : (
              <div className="backdrop-blur-lg rounded-full px-3 py-2 bg-accent/20 border border-accent/30">
                <Forward className="w-4 h-4 sm:w-5 sm:h-5 text-accent-foreground" />
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
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        whileTap={{ scale: 0.98 }}
        className={`relative group max-w-[75%] z-10 ${
          message.media_url && message.media_type === 'image'
            ? ''
            : 'glass backdrop-blur-xl px-4 py-2'
        } rounded-2xl ${isOwn ? 'glow-primary' : ''} touch-pan-y`}
      >
        {/* Reaction Animation Overlay */}
        <AnimatePresence>
          {showLikeAnimation && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.3, 1],
                opacity: [0, 1, 1, 0.8, 0]
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 0.8,
                times: [0, 0.3, 0.5, 0.8, 1],
                ease: "easeOut"
              }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
            >
              <motion.div
                animate={{ 
                  y: [0, -20, -40],
                  scale: [1, 1.2, 0.9]
                }}
                transition={{ 
                  duration: 0.8,
                  ease: "easeOut"
                }}
                className="text-6xl sm:text-7xl drop-shadow-2xl"
                style={{
                  filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))'
                }}
              >
                {selectedEmoji || '❤️'}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {message.reply_to_id && replyMessage && (
          <div
            className={`${
              message.media_url && message.media_type === 'image'
                ? 'px-4 pt-2'
                : ''
            } mb-2 p-2 glass backdrop-blur-lg rounded-lg text-xs opacity-70 border-l-2 border-primary cursor-pointer hover:opacity-100 transition-opacity`}
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
          <div className="relative w-32 h-32 mx-auto">
            <video 
              src={message.media_url} 
              controls 
              className="w-full h-full rounded-full object-cover ring-2 ring-primary/50 shadow-lg shadow-primary/20"
              playsInline
            />
          </div>
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
            message.media_url && message.media_type === 'image'
              ? 'px-4 pt-2'
              : ''
          } flex items-center gap-1 text-xs text-muted-foreground mb-1`}>
            <Forward className="w-3 h-3" />
            <span>Forwarded</span>
          </div>
        )}

        <p
          className={`${
            message.media_url && message.media_type === 'image'
              ? 'px-4 pt-2'
              : ''
          } break-words whitespace-pre-wrap ${message.edited ? 'italic' : ''}`}
        >
          {message.content}
          {message.edited && <span className="text-xs opacity-50 ml-2">(edited)</span>}
        </p>

        <div
          className={`${
            message.media_url && message.media_type === 'image'
              ? 'px-4 pb-2'
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
                <CheckCheck className="w-4 h-4 text-emerald-500 animate-pulse" />
              ) : message.delivered ? (
                <CheckCheck className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Check className="w-4 h-4 text-muted-foreground" />
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
