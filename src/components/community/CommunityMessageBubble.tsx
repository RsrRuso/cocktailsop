import { memo, useCallback, useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { format, isToday, isYesterday } from "date-fns";
import { Reply, Check, CheckCheck, RotateCcw, Loader2, Pin, Edit2, Forward, Trash2, Copy, X, Flag } from "lucide-react";
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from "framer-motion";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { toast } from "sonner";

interface Message {
  id: string;
  user_id: string;
  content: string | null;
  created_at: string;
  reactions: Record<string, string[]>;
  is_pinned?: boolean;
  edited?: boolean;
  forwarded_from?: string | null;
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

interface CommunityMessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  userId: string;
  isAdmin?: boolean;
  onReply: (message: Message) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onRetry?: (messageId: string) => void;
  onPin?: (messageId: string, pin: boolean) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onForward?: (message: Message) => void;
  onReport?: (messageId: string) => void;
}

const quickReactions = ["❤️", "👍", "😂", "😮", "😢", "🔥"];

const formatMessageTime = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return `Yesterday ${format(date, "HH:mm")}`;
  return format(date, "MMM d, HH:mm");
};

function CommunityMessageBubbleComponent({
  message,
  isOwn,
  showAvatar,
  userId,
  isAdmin = false,
  onReply,
  onReaction,
  onRetry,
  onPin,
  onEdit,
  onDelete,
  onForward,
  onReport,
}: CommunityMessageBubbleProps) {
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const doubleTapTimer = useRef<NodeJS.Timeout | null>(null);
  const tapCount = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Swipe to reply
  const x = useMotionValue(0);
  const swipeThreshold = 60;
  const replyOpacity = useTransform(x, [0, swipeThreshold], [0, 1]);
  const replyScale = useTransform(x, [0, swipeThreshold], [0.5, 1]);

  const handleCopy = useCallback(() => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      toast.success("Copied to clipboard");
    }
    setShowActionSheet(false);
  }, [message.content]);

  // Long press handler
  const startLongPress = useCallback(() => {
    longPressTimer.current = setTimeout(async () => {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch {}
      setShowActionSheet(true);
    }, 400);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Double tap for reaction
  const handleTap = useCallback(async (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    tapCount.current++;
    
    if (tapCount.current === 1) {
      doubleTapTimer.current = setTimeout(() => {
        tapCount.current = 0;
      }, 300);
    } else if (tapCount.current === 2) {
      if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);
      tapCount.current = 0;
      try {
        await Haptics.notification({ type: NotificationType.Success });
      } catch {}
      onReaction(message.id, "❤️");
    }
  }, [message.id, onReaction]);

  // Swipe end handler
  const handleDragEnd = useCallback(async (_: any, info: PanInfo) => {
    if (info.offset.x > swipeThreshold) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch {}
      onReply(message);
    }
  }, [message, onReply]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (doubleTapTimer.current) clearTimeout(doubleTapTimer.current);
    };
  }, []);

  const handleActionWithHaptic = useCallback(async (action: () => void) => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {}
    action();
    setShowActionSheet(false);
  }, []);

  return (
    <>
      <div ref={containerRef} className="relative">
        {/* Swipe reply indicator */}
        <motion.div 
          className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? "right-full mr-3" : "left-0 -ml-1"}`}
          style={{ opacity: replyOpacity, scale: replyScale }}
        >
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <Reply className="w-4 h-4 text-white" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
          style={{ 
            x,
            WebkitUserSelect: 'none',
            userSelect: 'none',
            WebkitTouchCallout: 'none',
          } as React.CSSProperties}
          drag="x"
          dragConstraints={{ left: 0, right: isOwn ? 0 : 80 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          onTouchStart={(e) => {
            e.preventDefault();
            startLongPress();
          }}
          onTouchEnd={cancelLongPress}
          onTouchMove={cancelLongPress}
          onMouseDown={startLongPress}
          onMouseUp={cancelLongPress}
          onMouseLeave={cancelLongPress}
          onClick={handleTap}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Avatar */}
          {showAvatar ? (
            <Avatar className="h-7 w-7 flex-shrink-0 ring-2 ring-background">
              <AvatarImage 
                src={message.profile?.avatar_url || ""} 
                loading="lazy"
              />
              <AvatarFallback className="bg-blue-500/20 text-blue-400 text-[10px] font-medium">
                {message.profile?.username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-7" />
          )}

          <div className={`flex flex-col max-w-[75%] ${isOwn ? "items-end" : ""}`}>
            {/* Header */}
            {showAvatar && (
              <div className={`flex items-center gap-2 mb-0.5 ${isOwn ? "flex-row-reverse" : ""}`}>
                <span className="text-xs font-medium text-white/70">
                  {message.profile?.full_name || message.profile?.username || "Unknown"}
                </span>
                {message.is_pinned && (
                  <Pin className="w-3 h-3 text-blue-400" />
                )}
                {message.edited && (
                  <span className="text-[10px] text-white/40 italic">edited</span>
                )}
                <span className="text-[10px] text-white/40">
                  {formatMessageTime(message.created_at)}
                </span>
              </div>
            )}

            {/* Reply Preview */}
            {message.reply_message && (
              <div 
                className={`text-[11px] px-2.5 py-1 mb-0.5 rounded-lg bg-white/5 border-l-2 border-blue-400/60 ${isOwn ? "mr-0" : "ml-0"}`}
              >
                <span className="font-medium text-blue-400/80">
                  {message.reply_message.user_id === userId ? "You" : message.reply_message.profile?.username || "User"}
                </span>
                <p className="text-white/40 truncate max-w-[200px]">{message.reply_message.content}</p>
              </div>
            )}

            {/* Message Bubble */}
            <motion.div
              className={`relative px-3 py-1.5 rounded-2xl select-none ${
                isOwn
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-white/10 text-white rounded-bl-sm"
              } ${message.failed ? "opacity-60" : ""} ${isPressed ? "scale-[0.98]" : ""}`}
              onTouchStart={() => setIsPressed(true)}
              onTouchEnd={() => setIsPressed(false)}
              animate={{ scale: isPressed ? 0.98 : 1 }}
              transition={{ duration: 0.1 }}
            >
              <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </p>

              {/* Status indicators */}
              <div className={`absolute -bottom-0.5 ${isOwn ? "-left-5" : "-right-5"} flex items-center gap-0.5`}>
                {message.sending && (
                  <Loader2 className="w-3 h-3 text-white/40 animate-spin" />
                )}
                {message.failed && onRetry && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 text-red-400 hover:text-red-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetry(message.id);
                    }}
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                )}
                {isOwn && !message.optimistic && !message.sending && !message.failed && (
                  <CheckCheck className="w-3 h-3 text-blue-300" />
                )}
              </div>
            </motion.div>

            {/* Quick Reactions on double-tap feedback */}
            <AnimatePresence>
              {showQuickReactions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  className={`flex gap-1 mt-1 bg-slate-800 rounded-full px-2 py-1 border border-white/10 ${
                    isOwn ? "self-end" : "self-start"
                  }`}
                >
                  {quickReactions.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReaction(message.id, emoji);
                        setShowQuickReactions(false);
                      }}
                      className="text-lg hover:scale-125 transition-transform p-0.5"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reactions Display */}
            {Object.keys(message.reactions).length > 0 && (
              <div className={`flex flex-wrap gap-1 mt-0.5 ${isOwn ? "justify-end" : ""}`}>
                {Object.entries(message.reactions).map(([emoji, users]) => (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.stopPropagation();
                      onReaction(message.id, emoji);
                    }}
                    className={`h-5 px-1.5 text-[11px] rounded-full flex items-center gap-0.5 transition-colors ${
                      users.includes(userId)
                        ? "bg-blue-500/30 text-white"
                        : "bg-white/10 text-white/70 hover:bg-white/15"
                    }`}
                  >
                    {emoji} {users.length}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Telegram-style Action Sheet */}
      <AnimatePresence>
        {showActionSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowActionSheet(false)}
            />
            
            {/* Action Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 rounded-t-3xl overflow-hidden safe-area-bottom"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              {/* Quick Reactions Row */}
              <div className="px-4 py-3 border-b border-white/10">
                <div className="flex justify-around">
                  {quickReactions.map((emoji) => (
                    <motion.button
                      key={emoji}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        onReaction(message.id, emoji);
                        setShowActionSheet(false);
                      }}
                      className="text-2xl p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="py-2">
                {/* Reply */}
                <ActionItem
                  icon={<Reply className="w-5 h-5" />}
                  label="Reply"
                  onClick={() => handleActionWithHaptic(() => onReply(message))}
                />

                {/* Copy */}
                {message.content && (
                  <ActionItem
                    icon={<Copy className="w-5 h-5" />}
                    label="Copy"
                    onClick={() => handleActionWithHaptic(handleCopy)}
                  />
                )}

                {/* Forward */}
                {onForward && (
                  <ActionItem
                    icon={<Forward className="w-5 h-5" />}
                    label="Forward"
                    onClick={() => handleActionWithHaptic(() => onForward(message))}
                  />
                )}

                {/* Pin/Unpin */}
                {(isAdmin || isOwn) && onPin && (
                  <ActionItem
                    icon={<Pin className="w-5 h-5" />}
                    label={message.is_pinned ? "Unpin" : "Pin"}
                    onClick={() => handleActionWithHaptic(() => onPin(message.id, !message.is_pinned))}
                  />
                )}

                {/* Edit (own messages only) */}
                {isOwn && onEdit && (
                  <ActionItem
                    icon={<Edit2 className="w-5 h-5" />}
                    label="Edit"
                    onClick={() => handleActionWithHaptic(() => onEdit(message))}
                  />
                )}

                {/* Report (other's messages) */}
                {!isOwn && onReport && (
                  <ActionItem
                    icon={<Flag className="w-5 h-5 text-orange-400" />}
                    label="Report"
                    labelClass="text-orange-400"
                    onClick={() => handleActionWithHaptic(() => onReport(message.id))}
                  />
                )}

                {/* Delete */}
                {(isAdmin || isOwn) && onDelete && (
                  <ActionItem
                    icon={<Trash2 className="w-5 h-5 text-red-400" />}
                    label="Delete"
                    labelClass="text-red-400"
                    onClick={() => handleActionWithHaptic(() => onDelete(message.id))}
                  />
                )}
              </div>

              {/* Cancel button */}
              <div className="p-4 pt-2">
                <Button
                  variant="ghost"
                  className="w-full h-12 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl font-medium"
                  onClick={() => setShowActionSheet(false)}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Action Item Component
function ActionItem({ 
  icon, 
  label, 
  onClick, 
  labelClass = "text-white/90" 
}: { 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void;
  labelClass?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98, backgroundColor: "rgba(255,255,255,0.1)" }}
      onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors"
    >
      <span className="text-white/60">{icon}</span>
      <span className={`text-[15px] font-medium ${labelClass}`}>{label}</span>
    </motion.button>
  );
}

export const CommunityMessageBubble = memo(CommunityMessageBubbleComponent);
