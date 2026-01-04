import { memo, useCallback, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { format, isToday, isYesterday } from "date-fns";
import { Reply, Smile, Check, CheckCheck, RotateCcw, Loader2, Pin, Edit2, Forward, MoreVertical, Trash2, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
}: CommunityMessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const handleCopy = useCallback(() => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      toast.success("Copied to clipboard");
    }
  }, [message.content]);

  const handleLongPress = useCallback(async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {}
    setShowReactions(true);
  }, []);

  const handleDoubleTap = useCallback(async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {}
    onReaction(message.id, "❤️");
  }, [message.id, onReaction]);

  let tapCount = 0;
  let tapTimer: NodeJS.Timeout;

  const handleTap = useCallback(() => {
    tapCount++;
    if (tapCount === 1) {
      tapTimer = setTimeout(() => {
        tapCount = 0;
      }, 300);
    } else if (tapCount === 2) {
      clearTimeout(tapTimer);
      tapCount = 0;
      handleDoubleTap();
    }
  }, [handleDoubleTap]);

  const handleSwipeReply = useCallback(() => {
    onReply(message);
  }, [message, onReply]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={`flex gap-2 group ${isOwn ? "flex-row-reverse" : ""}`}
      onContextMenu={(e) => {
        e.preventDefault();
        handleLongPress();
      }}
      onClick={handleTap}
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
          className={`relative px-3 py-1.5 rounded-2xl ${
            isOwn
              ? "bg-blue-600 text-white rounded-br-sm"
              : "bg-white/10 text-white rounded-bl-sm"
          } ${message.failed ? "opacity-60" : ""} ${isPressed ? "scale-[0.98]" : ""}`}
          onTouchStart={() => setIsPressed(true)}
          onTouchEnd={() => setIsPressed(false)}
          whileTap={{ scale: 0.98 }}
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

          {/* Quick actions on hover */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-150 flex gap-0.5 bg-slate-800/90 rounded-full p-1 ${
              isOwn ? "-left-20" : "-right-20"
            }`}
          >
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onReply(message);
              }}
            >
              <Reply className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                setShowReactions(true);
              }}
            >
              <Smile className="w-3.5 h-3.5" />
            </Button>
            {/* More actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-white/60 hover:text-white hover:bg-white/10 rounded-full"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-800 border-white/10 min-w-[140px]">
                {onForward && (
                  <DropdownMenuItem
                    onClick={() => onForward(message)}
                    className="text-white/80 hover:bg-white/10 focus:bg-white/10"
                  >
                    <Forward className="w-4 h-4 mr-2" />
                    Forward
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={handleCopy}
                  className="text-white/80 hover:bg-white/10 focus:bg-white/10"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </DropdownMenuItem>
                {(isAdmin || isOwn) && onPin && (
                  <DropdownMenuItem
                    onClick={() => onPin(message.id, !message.is_pinned)}
                    className="text-white/80 hover:bg-white/10 focus:bg-white/10"
                  >
                    <Pin className="w-4 h-4 mr-2" />
                    {message.is_pinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                )}
                {isOwn && onEdit && (
                  <DropdownMenuItem
                    onClick={() => onEdit(message)}
                    className="text-white/80 hover:bg-white/10 focus:bg-white/10"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {(isAdmin || isOwn) && onDelete && (
                  <>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={() => onDelete(message.id)}
                      className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>

        {/* Quick Reactions Popup */}
        {showReactions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className={`flex gap-1 mt-1 bg-slate-800 rounded-full px-2 py-1 border border-white/10 ${
              isOwn ? "self-end" : "self-start"
            }`}
            onMouseLeave={() => setShowReactions(false)}
          >
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                onClick={(e) => {
                  e.stopPropagation();
                  onReaction(message.id, emoji);
                  setShowReactions(false);
                }}
                className="text-lg hover:scale-125 transition-transform p-0.5"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}

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
  );
}

export const CommunityMessageBubble = memo(CommunityMessageBubbleComponent);
