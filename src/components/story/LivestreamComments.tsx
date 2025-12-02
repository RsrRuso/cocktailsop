import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OptimizedAvatar from "@/components/OptimizedAvatar";
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
  isOpen: boolean;
  onClose: () => void;
}

export const LivestreamComments = ({
  contentId,
  isOpen,
  onClose,
}: LivestreamCommentsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchComments();
      const unsubscribe = subscribeToComments();
      return unsubscribe;
    }
  }, [isOpen, contentId]);

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
          setComments((prev) => [...prev, payload.new as StoryComment]);
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
    try {
      const { error: insertError } = await supabase
        .from("story_comments" as any)
        .insert({
          story_id: contentId,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (insertError) throw insertError;

      setNewComment("");
      
      // Update comment count
      const { data: currentStory } = await supabase
        .from("stories")
        .select("comment_count")
        .eq("id", contentId)
        .single();
        
      if (currentStory) {
        await supabase
          .from("stories")
          .update({ comment_count: (currentStory.comment_count || 0) + 1 })
          .eq("id", contentId);
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-x-0 bottom-0 z-50 h-[60vh] pointer-events-auto"
      style={{
        background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)",
        backdropFilter: "blur(10px)",
      }}
    >
      {/* Close button */}
      <div className="absolute top-2 right-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20 rounded-full"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Comments container */}
      <div className="h-full flex flex-col px-4 pt-12 pb-20">
        <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
          <AnimatePresence mode="popLayout">
            {comments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  type: "spring",
                  damping: 20,
                  stiffness: 300,
                  delay: index * 0.05,
                }}
                className="flex items-start gap-2"
              >
                <OptimizedAvatar
                  src={comment.profiles?.avatar_url || ""}
                  alt={comment.profiles?.full_name || "User"}
                  className="flex-shrink-0 w-8 h-8"
                />
                <div
                  className="rounded-2xl px-4 py-2 max-w-[80%]"
                  style={{
                    background: "rgba(255, 255, 255, 0.15)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                  }}
                >
                  <p className="text-xs font-semibold text-white mb-1">
                    {comment.profiles?.full_name || "Anonymous"}
                  </p>
                  <p className="text-sm text-white/90">{comment.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={commentsEndRef} />
        </div>

        {/* Input form */}
        <form
          onSubmit={handleSubmit}
          className="mt-4 flex items-center gap-2"
        >
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-white/20 border-white/30 text-white placeholder:text-white/60 backdrop-blur-md rounded-full"
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newComment.trim() || isSubmitting}
            className="rounded-full bg-primary hover:bg-primary/90 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </motion.div>
  );
};
