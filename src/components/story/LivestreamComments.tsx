import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ChevronUp, ChevronDown, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { SmartCommentSuggestions } from "./SmartCommentSuggestions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

interface StoryComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  reply_to?: string | null;
  reactions?: { [userId: string]: string } | null;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface FlyingHeart {
  id: string;
  x: number;
  y: number;
  color: string;
  userId: string;
}

interface LivestreamCommentsProps {
  contentId: string;
  onPauseChange?: (paused: boolean) => void;
  onForwardComment?: (comment: StoryComment) => void;
}

export const LivestreamComments = ({
  contentId,
  onPauseChange,
  onForwardComment,
}: LivestreamCommentsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [flyingHearts, setFlyingHearts] = useState<FlyingHeart[]>([]);
  const [replyingTo, setReplyingTo] = useState<StoryComment | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const submittedIdsRef = useRef<Set<string>>(new Set());
  const lastCommentTimeRef = useRef<number>(0);
  const commentCountRef = useRef<number>(0);
  const heartChannelRef = useRef<any>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout>();

  const heartColors = [
    "#FF69B4", // Hot Pink
    "#FF1493", // Deep Pink
    "#FF6B9D", // Light Pink
    "#C71585", // Medium Violet Red
    "#FF4500", // Orange Red
    "#FF69B4", // Hot Pink
    "#FF10F0", // Bright Pink
    "#E91E63", // Material Pink
  ];

  useEffect(() => {
    fetchComments();
    const commentsUnsubscribe = subscribeToComments();
    const heartsUnsubscribe = subscribeToHearts();
    
    return () => {
      commentsUnsubscribe();
      heartsUnsubscribe();
    };
  }, [contentId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("story_comments" as any)
        .select(`
          id,
          content,
          created_at,
          user_id,
          reply_to,
          reactions,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq("story_id", contentId)
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) {
        console.error("Error fetching comments:", error);
        return;
      }
      
      setComments((data || []) as unknown as StoryComment[]);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const subscribeToHearts = () => {
    const channel = supabase
      .channel(`story_hearts_${contentId}`)
      .on(
        "broadcast" as any,
        { event: "heart" },
        (payload: any) => {
          if (payload.payload.userId !== user?.id) {
            createHeart(payload.payload);
            triggerVibration();
          }
        }
      )
      .subscribe();

    heartChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createHeart = (heartData?: { x?: number; y?: number; color?: string; userId?: string }) => {
    const heart: FlyingHeart = {
      id: Math.random().toString(36),
      x: heartData?.x ?? Math.random() * (window.innerWidth - 100) + 50,
      y: heartData?.y ?? window.innerHeight - 150,
      color: heartData?.color ?? heartColors[Math.floor(Math.random() * heartColors.length)],
      userId: heartData?.userId ?? user?.id ?? "unknown",
    };

    setFlyingHearts((prev) => [...prev, heart]);

    setTimeout(() => {
      setFlyingHearts((prev) => prev.filter((h) => h.id !== heart.id));
    }, 2000);

    return heart;
  };

  const triggerVibration = async () => {
    try {
      const platform = Capacitor.getPlatform();

      if (platform === "ios" || platform === "android") {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if ("vibrate" in navigator) {
        navigator.vibrate(50);
      }
    } catch (error) {
      if ("vibrate" in navigator) {
        navigator.vibrate(50);
      }
      console.error("Error triggering haptics:", error);
    }
  };

  const broadcastHeart = async (heart: FlyingHeart) => {
    if (heartChannelRef.current) {
      await heartChannelRef.current.send({
        type: "broadcast",
        event: "heart",
        payload: heart,
      });
    }
  };

  const subscribeToComments = () => {
    const channel = supabase
      .channel(`story_comments_${contentId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "story_comments",
          filter: `story_id=eq.${contentId}`,
        },
        (payload: any) => {
          const newComment = payload.new as StoryComment;
          
          // Prevent duplicate if we just submitted this comment
          if (submittedIdsRef.current.has(newComment.id)) {
            submittedIdsRef.current.delete(newComment.id);
            return;
          }
          
          // Check if comment already exists
          setComments((prev) => {
            if (prev.some(c => c.id === newComment.id)) {
              return prev;
            }
            return [...prev, newComment];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    if (!user) return;
    
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        const reactions = { ...(comment.reactions || {}) };
        if (reactions[user.id] === emoji) {
          delete reactions[user.id];
        } else {
          reactions[user.id] = emoji;
        }
        return { ...comment, reactions };
      }
      return comment;
    }));
    
    setShowEmojiPicker(null);
    triggerVibration();
  };

  const handleDoubleTap = (commentId: string) => {
    handleReaction(commentId, "❤️");
  };

  const handleLongPress = (commentId: string) => {
    setShowEmojiPicker(commentId);
    triggerVibration();
  };

  const handleTouchStart = (commentId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      handleLongPress(commentId);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || isSubmitting) return;

    // Detect rapid typing
    const now = Date.now();
    const timeSinceLastComment = now - lastCommentTimeRef.current;
    
    if (timeSinceLastComment < 2000) {
      commentCountRef.current += 1;
      // Trigger vibration on every rapid comment
      triggerVibration();
    } else {
      commentCountRef.current = 1;
    }
    
    lastCommentTimeRef.current = now;

    // Trigger hearts if typing rapidly (3+ comments in 2 seconds)
    if (commentCountRef.current >= 3) {
      const heartsToCreate = Math.min(commentCountRef.current, 8);
      for (let i = 0; i < heartsToCreate; i++) {
        setTimeout(() => {
          const heart = createHeart();
          broadcastHeart(heart);
        }, i * 100);
      }
      commentCountRef.current = 0;
    }

    setIsSubmitting(true);
    const commentContent = newComment.trim();
    setNewComment("");

    try {
      const { data: insertedComment, error: insertError } = await supabase
        .from("story_comments" as any)
        .insert({
          story_id: contentId,
          user_id: user.id,
          content: commentContent,
          reply_to: replyingTo?.id || null,
        })
        .select(`
          id,
          content,
          created_at,
          user_id
        `)
        .single();

      if (insertError) throw insertError;

      // Track this ID to prevent duplicate from realtime
      if (insertedComment) {
        const commentWithProfile: StoryComment = {
          ...(insertedComment as any),
          profiles: {
            full_name: user.user_metadata?.full_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
          }
        };
        
        submittedIdsRef.current.add((insertedComment as any).id);
        
        // Optimistically add to UI
        setComments((prev) => [...prev, commentWithProfile]);
        setReplyingTo(null);
      }

    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
      setNewComment(commentContent); // Restore comment on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const reactionEmojis = ["❤️", "😂", "😮", "😢", "😍", "🙏", "👍", "🔥"];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col pointer-events-none">
      {/* Flying hearts */}
      <AnimatePresence>
        {flyingHearts.map((heart) => (
          <motion.div
            key={heart.id}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              y: -200,
              x: [0, Math.random() * 40 - 20, Math.random() * 60 - 30],
              scale: [0.5, 1.2, 1, 0.8],
              rotate: [0, Math.random() * 20 - 10, Math.random() * 30 - 15]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute pointer-events-none"
            style={{
              left: heart.x,
              bottom: 100,
            }}
          >
            <Heart 
              className="w-8 h-8" 
              fill={heart.color}
              color={heart.color}
              style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.5))" }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Toggle button */}
      <div className="flex justify-center pb-1 pointer-events-auto">
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          size="sm"
          variant="ghost"
          className="rounded-full h-8 w-8 p-0 bg-black/50 backdrop-blur-sm hover:bg-black/70 border border-white/20"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-white" />
          ) : (
            <ChevronUp className="w-4 h-4 text-white" />
          )}
        </Button>
      </div>

      {/* Scrollable comments area - pauses story when scrolling */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div 
              className="max-h-40 overflow-y-auto px-4 pb-1 pointer-events-auto scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent"
              onTouchStart={() => onPauseChange?.(true)}
              onTouchEnd={() => onPauseChange?.(false)}
              onMouseEnter={() => onPauseChange?.(true)}
              onMouseLeave={() => onPauseChange?.(false)}
            >
              <div className="space-y-1">
                {comments.map((comment) => {
                  const reactionCount = comment.reactions ? Object.keys(comment.reactions).length : 0;
                  const userReaction = comment.reactions?.[user?.id || ""];
                  
                  return (
                    <motion.div
                      key={comment.id}
                      className={`flex items-start gap-1.5 ${comment.reply_to ? "ml-6" : ""}`}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.2}
                      onDragEnd={(e, info) => {
                        const swipeThreshold = 50;
                        if (info.offset.x < -swipeThreshold) {
                          // Swipe left → Reply
                          setReplyingTo(comment);
                          triggerVibration();
                        } else if (info.offset.x > swipeThreshold) {
                          // Swipe right → Forward
                          onForwardComment?.(comment);
                          triggerVibration();
                        }
                      }}
                    >
                      <OptimizedAvatar
                        src={comment.profiles?.avatar_url || ""}
                        alt={comment.profiles?.full_name || "User"}
                        className="w-5 h-5 flex-shrink-0 ring-1 ring-white/20"
                      />
                      <div className="flex-1 max-w-[75%]">
                        <div
                          className="bg-black/50 backdrop-blur-sm rounded-2xl px-2.5 py-1 relative"
                          onDoubleClick={() => handleDoubleTap(comment.id)}
                          onTouchStart={() => handleTouchStart(comment.id)}
                          onTouchEnd={handleTouchEnd}
                        >
                          <span className="text-white font-semibold text-[10px]">
                            {comment.profiles?.full_name || "Anonymous"}
                          </span>
                          <span className="text-white/90 text-[10px] ml-1.5">
                            {comment.content}
                          </span>
                          
                          {reactionCount > 0 && (
                            <div className="absolute -bottom-1 -right-1 bg-background/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 flex items-center gap-0.5 border border-border/20">
                              <span className="text-[8px]">{Object.values(comment.reactions || {})[0]}</span>
                              {reactionCount > 1 && (
                                <span className="text-[8px] text-muted-foreground">{reactionCount}</span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => setReplyingTo(comment)}
                          className="text-[9px] text-white/60 mt-0.5 ml-2"
                        >
                          Reply
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
            onClick={() => setShowEmojiPicker(null)}
          >
            <div className="bg-black/90 backdrop-blur-xl rounded-3xl p-4 max-w-xs" onClick={(e) => e.stopPropagation()}>
              <div className="grid grid-cols-4 gap-3">
                {reactionEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(showEmojiPicker, emoji)}
                    className="text-3xl hover:scale-125 transition-transform active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="bg-gradient-to-t from-black/70 via-black/50 to-transparent backdrop-blur-sm px-4 py-2 pointer-events-auto">
        {replyingTo && (
          <div className="flex items-center justify-between mb-1 px-2">
            <span className="text-[10px] text-white/60">
              Replying to {replyingTo.profiles?.full_name || "Anonymous"}
            </span>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-[10px] text-white/80"
            >
              Cancel
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60 text-xs rounded-full h-8"
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newComment.trim() || isSubmitting}
            className="rounded-full h-8 w-8 p-0"
          >
            <Send className="w-3 h-3" />
          </Button>
        </form>
      </div>
    </div>
  );
};
