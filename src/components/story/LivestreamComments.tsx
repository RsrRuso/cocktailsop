import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { SmartCommentSuggestions } from "./SmartCommentSuggestions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface StoryComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface LivestreamCommentsProps {
  contentId: string;
}

export const LivestreamComments = ({
  contentId,
}: LivestreamCommentsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const submittedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchComments();
    const unsubscribe = subscribeToComments();
    return unsubscribe;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || isSubmitting) return;

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
      }

    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
      setNewComment(commentContent); // Restore comment on error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Floating comments - auto-scrolling upward */}
      <div className="absolute bottom-24 left-0 right-0 h-[50vh] overflow-hidden pointer-events-none px-4">
        <div className="flex flex-col-reverse gap-3 pb-4">
          <AnimatePresence mode="popLayout">
            {comments.slice(-8).map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 30, x: -20 }}
                animate={{ 
                  opacity: 1,
                  y: 0,
                  x: 0,
                }}
                exit={{ opacity: 0, y: -30 }}
                transition={{
                  duration: 0.4,
                  ease: "easeOut",
                }}
                className="flex items-start gap-2"
              >
                <OptimizedAvatar
                  src={comment.profiles?.avatar_url || ""}
                  alt={comment.profiles?.full_name || "User"}
                  className="flex-shrink-0 w-8 h-8 ring-2 ring-white/30"
                />
                <div
                  className="rounded-2xl px-4 py-2 max-w-[70%]"
                  style={{
                    background: "rgba(0, 0, 0, 0.8)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                  }}
                >
                  <p className="text-xs font-semibold text-white mb-0.5 drop-shadow-lg">
                    {comment.profiles?.full_name || "Anonymous"}
                  </p>
                  <p className="text-sm text-white/95 leading-snug drop-shadow-lg">
                    {comment.content}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom input area */}
      <div className="absolute bottom-20 left-0 right-0 pointer-events-auto px-4">
        {/* Input form */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2"
        >
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-black/60 border-white/30 text-white placeholder:text-white/60 backdrop-blur-md rounded-full h-11 px-4 text-sm focus:ring-2 focus:ring-white/40"
            disabled={isSubmitting}
            autoComplete="off"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newComment.trim() || isSubmitting}
            className="rounded-full bg-white/90 hover:bg-white text-black flex-shrink-0 h-11 w-11 shadow-lg disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
  };
