import { Message } from '@/hooks/useMessageThread';
import { Check, CheckCheck, Reply, Trash2, Forward } from 'lucide-react';
import { LazyImage } from './LazyImage';
import { VoiceWaveform } from './VoiceWaveform';
import { useState, useRef, useEffect, memo, useCallback } from 'react';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  replyMessage?: Message | null;
  onReply: (message: Message) => void;
  onDelete?: () => void;
  onForward?: () => void;
  children?: React.ReactNode;
}

export const MessageBubble = memo(({
  message,
  isOwn,
  replyMessage,
  onReply,
  onDelete,
  onForward,
  children,
}: MessageBubbleProps) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - touchStartX.current;
    const deltaY = touchY - touchStartY.current;

    // Only allow horizontal swipe if it's more horizontal than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
      
      // Limit swipe distance
      const maxSwipe = isOwn ? -120 : 120;
      const newOffset = Math.max(Math.min(deltaX, Math.abs(maxSwipe)), -Math.abs(maxSwipe));
      
      // Only allow swipe in the correct direction
      if ((isOwn && newOffset < 0) || (!isOwn && newOffset > 0)) {
        setSwipeOffset(newOffset);
      }
    }
  }, [isSwiping, isOwn]);

  const handleTouchEnd = useCallback(() => {
    setIsSwiping(false);
    
    // If swiped enough, trigger action
    if (Math.abs(swipeOffset) > 60) {
      // Keep it open for a moment to show the action
      setTimeout(() => {
        setSwipeOffset(0);
      }, 300);
    } else {
      setSwipeOffset(0);
    }
  }, [swipeOffset]);

  useEffect(() => {
    // Reset swipe when message changes
    setSwipeOffset(0);
  }, [message.id]);

  const shouldShowActions = Math.abs(swipeOffset) > 30;

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} relative`}>
      {/* Action buttons for left swipe (own messages) */}
      {isOwn && shouldShowActions && (
        <div className="absolute right-0 top-0 h-full flex items-center gap-2 pr-2 z-0">
          <button
            onClick={() => {
              onForward?.();
              setSwipeOffset(0);
            }}
            className="w-10 h-10 rounded-full bg-accent/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Forward className="w-5 h-5 text-accent-foreground" />
          </button>
          <button
            onClick={() => {
              onDelete?.();
              setSwipeOffset(0);
            }}
            className="w-10 h-10 rounded-full bg-destructive/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Trash2 className="w-5 h-5 text-destructive-foreground" />
          </button>
        </div>
      )}

      {/* Action buttons for right swipe (other's messages) */}
      {!isOwn && shouldShowActions && (
        <div className="absolute left-0 top-0 h-full flex items-center gap-2 pl-2 z-0">
          <button
            onClick={() => {
              onReply(message);
              setSwipeOffset(0);
            }}
            className="w-10 h-10 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Reply className="w-5 h-5 text-primary-foreground" />
          </button>
          <button
            onClick={() => {
              onForward?.();
              setSwipeOffset(0);
            }}
            className="w-10 h-10 rounded-full bg-accent/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Forward className="w-5 h-5 text-accent-foreground" />
          </button>
        </div>
      )}
      <div
        ref={bubbleRef}
        id={`message-${message.id}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className={`relative group max-w-[75%] z-10 ${
          message.media_url && (message.media_type === 'image' || message.media_type === 'video')
            ? ''
            : 'glass backdrop-blur-xl px-4 py-2'
        } rounded-2xl ${isOwn ? 'glow-primary' : ''} touch-pan-y`}
      >
        {message.reply_to_id && replyMessage && (
          <div
            className={`${
              message.media_url && (message.media_type === 'image' || message.media_type === 'video')
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
              ? 'px-4 pt-2'
              : ''
          } break-words whitespace-pre-wrap ${message.edited ? 'italic' : ''}`}
        >
          {message.content}
          {message.edited && <span className="text-xs opacity-50 ml-2">(edited)</span>}
        </p>

        <div
          className={`${
            message.media_url && (message.media_type === 'image' || message.media_type === 'video')
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
      </div>
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
