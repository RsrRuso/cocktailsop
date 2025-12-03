import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

interface ReelComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_comment_id?: string | null;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

interface FlyingHeart {
  id: string;
  x: number;
  y: number;
  color: string;
  userId: string;
}

interface ReelLivestreamCommentsProps {
  reelId: string;
  onPauseChange?: (paused: boolean) => void;
}

export const ReelLivestreamComments = ({
  reelId,
  onPauseChange,
}: ReelLivestreamCommentsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flyingHearts, setFlyingHearts] = useState<FlyingHeart[]>([]);
  const submittedIdsRef = useRef<Set<string>>(new Set());
  const lastCommentTimeRef = useRef<number>(0);
  const commentCountRef = useRef<number>(0);
  const heartChannelRef = useRef<any>(null);
  const commentsContainerRef = useRef<HTMLDivElement>(null);

  const heartColors = [
    "#FF69B4", "#FF1493", "#FF6B9D", "#C71585", 
    "#FF4500", "#FF10F0", "#E91E63", "#FF69B4",
  ];

  useEffect(() => {
    fetchComments();
    const commentsUnsubscribe = subscribeToComments();
    const heartsUnsubscribe = subscribeToHearts();
    
    return () => {
      commentsUnsubscribe();
      heartsUnsubscribe();
    };
  }, [reelId]);

  // Auto-scroll to latest comment
  useEffect(() => {
    if (commentsContainerRef.current && comments.length > 0) {
      commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight;
    }
  }, [comments]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from("reel_comments")
        .select(`
          id,
          content,
          created_at,
          user_id,
          parent_comment_id,
          profiles:user_id (
            full_name,
            avatar_url,
            username
          )
        `)
        .eq("reel_id", reelId)
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) {
        console.error("Error fetching comments:", error);
        return;
      }
      
      setComments((data || []) as unknown as ReelComment[]);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const subscribeToHearts = () => {
    const channel = supabase
      .channel(`reel_hearts_${reelId}`)
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
      .channel(`reel_comments_${reelId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "reel_comments",
          filter: `reel_id=eq.${reelId}`,
        },
        async (payload: any) => {
          const newComment = payload.new;
          
          if (submittedIdsRef.current.has(newComment.id)) {
            submittedIdsRef.current.delete(newComment.id);
            return;
          }
          
          // Fetch profile for the new comment
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url, username")
            .eq("id", newComment.user_id)
            .single();
          
          setComments((prev) => {
            if (prev.some(c => c.id === newComment.id)) return prev;
            return [...prev, { ...newComment, profiles: profile }];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || !user || isSubmitting) return;

    const now = Date.now();
    const timeSinceLastComment = now - lastCommentTimeRef.current;
    
    if (timeSinceLastComment < 2000) {
      commentCountRef.current += 1;
      triggerVibration();
    } else {
      commentCountRef.current = 1;
    }
    
    lastCommentTimeRef.current = now;

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
        .from("reel_comments")
        .insert({
          reel_id: reelId,
          user_id: user.id,
          content: commentContent,
        })
        .select("id, content, created_at, user_id")
        .single();

      if (insertError) throw insertError;

      if (insertedComment) {
        const commentWithProfile: ReelComment = {
          ...insertedComment,
          profiles: {
            full_name: user.user_metadata?.full_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
            username: user.user_metadata?.username || null,
          }
        };
        
        submittedIdsRef.current.add(insertedComment.id);
        setComments((prev) => [...prev, commentWithProfile]);
      }

    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
      setNewComment(commentContent);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col pointer-events-none pb-safe">
      {/* Flying hearts */}
      <AnimatePresence>
        {flyingHearts.map((heart) => (
          <motion.div
            key={heart.id}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ 
              opacity: [0, 1, 1, 0],
              y: -300,
              x: [0, Math.random() * 40 - 20, Math.random() * 60 - 30],
              scale: [0.5, 1.2, 1, 0.8],
              rotate: [0, Math.random() * 20 - 10, Math.random() * 30 - 15]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute pointer-events-none"
            style={{ left: heart.x, bottom: 100 }}
          >
            <Heart 
              className="w-10 h-10" 
              fill={heart.color}
              color={heart.color}
              style={{ filter: "drop-shadow(0 0 10px rgba(255,255,255,0.6))" }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Floating comments section - always visible at bottom */}
      <div className="flex flex-col">
        {/* Comments flowing up */}
        <div 
          ref={commentsContainerRef}
          className="max-h-52 overflow-y-auto px-4 pb-2 pointer-events-auto scrollbar-hide"
          onTouchStart={() => onPauseChange?.(true)}
          onTouchEnd={() => onPauseChange?.(false)}
          onMouseEnter={() => onPauseChange?.(true)}
          onMouseLeave={() => onPauseChange?.(false)}
        >
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 40, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -30, scale: 0.9 }}
                  transition={{ 
                    duration: 0.4,
                    type: "spring",
                    stiffness: 350,
                    damping: 25
                  }}
                  className="flex items-start gap-2"
                >
                  <OptimizedAvatar
                    src={comment.profiles?.avatar_url || ""}
                    alt={comment.profiles?.full_name || "User"}
                    className="w-7 h-7 flex-shrink-0 ring-1 ring-white/30"
                  />
                  <div className="flex-1 max-w-[85%]">
                    <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-3 py-2 inline-block">
                      <span className="text-white font-semibold text-xs block">
                        {comment.profiles?.username || comment.profiles?.full_name || "Anonymous"}
                      </span>
                      <span className="text-white/90 text-sm">
                        {comment.content}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {/* Empty state hint */}
            {comments.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white/40 text-xs text-center py-2"
              >
                Be the first to comment!
              </motion.div>
            )}
          </div>
        </div>

        {/* Comment input - always visible */}
        <form 
          onSubmit={handleSubmit}
          className="px-4 pb-4 pt-2 pointer-events-auto"
        >
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-full px-4 py-2.5 border border-white/20">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-transparent border-none text-white placeholder:text-white/50 text-sm focus-visible:ring-0 h-8 px-0"
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-white hover:bg-white/20 rounded-full"
              disabled={isSubmitting || !newComment.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
