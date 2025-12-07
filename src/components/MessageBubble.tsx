import { Message } from '@/hooks/useMessageThread';
import { Check, CheckCheck, Reply, Trash2, Forward, Edit, MoreVertical } from 'lucide-react';
import { LazyImage } from './LazyImage';
import { VoiceWaveform } from './VoiceWaveform';
import { useState, useRef, useCallback, memo } from 'react';
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
  onEdit,
  onReaction,
  children,
}: MessageBubbleProps) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ x: 0, y: 0 });
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);
  const lastTapTime = useRef(0);
  const longPressTimer = useRef<NodeJS.Timeout>();
  const bubbleRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = Date.now();
    
    longPressTimer.current = setTimeout(() => {
      const rect = bubbleRef.current?.getBoundingClientRect();
      if (rect) {
        setEmojiPickerPosition({ x: rect.left + rect.width / 2, y: rect.top - 20 });
        setShowEmojiPicker(true);
        if ('vibrate' in navigator) navigator.vibrate(30);
      }
    }, 400);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 10) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      setSwipeOffset(Math.max(Math.min(deltaX, 80), -80));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    
    const now = Date.now();
    const duration = now - touchStartTime.current;
    
    // Double tap for heart
    if (duration < 250 && Math.abs(swipeOffset) < 10) {
      if (now - lastTapTime.current < 350) {
        onReaction?.('❤️');
        if ('vibrate' in navigator) navigator.vibrate(20);
      }
      lastTapTime.current = now;
    }
    
    // Swipe actions
    if (swipeOffset > 40) onReply(message);
    if (swipeOffset < -40) onForward?.();
    
    setTimeout(() => setSwipeOffset(0), 150);
  }, [swipeOffset, onReply, onForward, onReaction, message]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setShowEmojiPicker(false);
    onReaction?.(emoji);
  }, [onReaction]);

  const hasMedia = message.media_url && (message.media_type === 'image' || message.media_type === 'video' || message.media_type === 'voice');

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} relative`}>
      {/* Emoji Picker Backdrop */}
      {showEmojiPicker && (
        <div className="fixed inset-0 z-[99]" onClick={() => setShowEmojiPicker(false)} />
      )}
      
      <EmojiReactionPicker
        show={showEmojiPicker}
        onSelect={handleEmojiSelect}
        position={emojiPickerPosition}
      />

      {/* Swipe indicators */}
      {Math.abs(swipeOffset) > 30 && (
        <div className={`absolute ${swipeOffset > 0 ? 'left-1' : 'right-1'} top-1/2 -translate-y-1/2`}>
          {swipeOffset > 0 ? (
            <Reply className="w-4 h-4 text-primary" />
          ) : (
            <Forward className="w-4 h-4 text-muted-foreground" />
          )}
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
          transition: swipeOffset === 0 ? 'transform 0.15s ease-out' : 'none',
        }}
        className={`relative group max-w-[80%] ${
          hasMedia ? '' : 'px-3 py-2'
        } ${
          hasMedia ? '' : 'rounded-2xl'
        } ${
          isOwn 
            ? hasMedia ? '' : 'bg-primary text-primary-foreground' 
            : hasMedia ? '' : 'bg-muted'
        } touch-pan-y`}
      >
        {/* Reply Preview */}
        {message.reply_to_id && replyMessage && (
          <div className={`${hasMedia ? 'px-3 pt-2' : ''} mb-1 p-1.5 bg-background/20 rounded text-xs opacity-70 border-l-2 border-current`}>
            <p className="truncate">{replyMessage.content}</p>
          </div>
        )}

        {/* Media Content */}
        {message.media_url && message.media_type === 'image' && (
          <LazyImage src={message.media_url} alt="Shared" className="w-full max-w-xs rounded-xl" />
        )}

        {message.media_url && message.media_type === 'video' && (
          <video src={message.media_url} controls className="w-full max-w-xs rounded-xl" playsInline />
        )}

        {message.media_url && message.media_type === 'voice' && (
          <VoiceWaveform audioUrl={message.media_url} />
        )}

        {message.media_url && message.media_type === 'document' && (
          <a href={message.media_url} target="_blank" rel="noopener noreferrer" 
             className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
            <span>📎</span>
            <span className="truncate">{message.media_url.split('/').pop()}</span>
          </a>
        )}

        {/* Text Content */}
        {!(message.media_url && (message.media_type === 'video' || message.media_type === 'voice')) && (
          <p className={`${hasMedia ? 'px-3 py-1' : ''} break-words text-sm ${message.edited ? 'italic' : ''}`}>
            {message.content}
          </p>
        )}

        {/* Timestamp & Status */}
        <div className={`${hasMedia ? 'px-3 pb-1' : ''} flex items-center justify-end gap-1 mt-0.5`}>
          <span className="text-[10px] opacity-60">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOwn && (
            message.read ? <CheckCheck className="w-3 h-3 text-blue-400" /> : 
            message.delivered ? <CheckCheck className="w-3 h-3 opacity-60" /> : 
            <Check className="w-3 h-3 opacity-60" />
          )}
        </div>

        {/* Actions Menu */}
        <div className="absolute -top-2 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-background/80">
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => onReply(message)}>
                <Reply className="w-3.5 h-3.5 mr-2" /> Reply
              </DropdownMenuItem>
              {onForward && (
                <DropdownMenuItem onClick={onForward}>
                  <Forward className="w-3.5 h-3.5 mr-2" /> Forward
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-3.5 h-3.5 mr-2" /> Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {children}
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';
