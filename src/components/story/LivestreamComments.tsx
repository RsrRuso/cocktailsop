import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ChevronUp, ChevronDown } from "lucide-react";
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
  onPauseChange?: (paused: boolean) => void;
}

export const LivestreamComments = ({
  contentId,
  onPauseChange,
}: LivestreamCommentsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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
    <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col pointer-events-none">
      {/* Toggle button */}
      <div className="flex justify-center pb-1 pointer-events-auto">
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          size="sm"
          variant="ghost"
          className="rounded-full h-8 px-3 bg-black/50 backdrop-blur-sm hover:bg-black/70 border border-white/20"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-white" />
          ) : (
            <ChevronUp className="w-4 h-4 text-white" />
          )}
          <span className="text-white text-xs ml-1">
            {isExpanded ? "Hide" : "Show"} Comments
          </span>
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
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex items-start gap-1.5"
                  >
                    <OptimizedAvatar
                      src={comment.profiles?.avatar_url || ""}
                      alt={comment.profiles?.full_name || "User"}
                      className="w-5 h-5 flex-shrink-0 ring-1 ring-white/20"
                    />
                    <div className="bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1 max-w-[75%]">
                      <span className="text-white font-semibold text-[10px]">
                        {comment.profiles?.full_name || "Anonymous"}
                      </span>
                      <span className="text-white/90 text-[10px] ml-1.5">
                        {comment.content}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="bg-gradient-to-t from-black/70 via-black/50 to-transparent backdrop-blur-sm px-4 py-2 pointer-events-auto">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
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
