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
  const submittedIdsRef = useRef<Set<string>>(new Set());

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
      className="fixed inset-x-0 bottom-0 z-50 h-[70vh] pointer-events-auto"
      style={{
        background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.2) 80%, transparent 100%)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Close button */}
      <div className="absolute top-3 right-3 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20 rounded-full backdrop-blur-sm bg-black/30"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Comments container */}
      <div className="h-full flex flex-col px-4 pt-14 pb-6">
        <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide pb-4">
          <AnimatePresence mode="popLayout">
            {comments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, x: -50, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  x: 0, 
                  scale: 1,
                  y: [10, 0, -2, 0]
                }}
                exit={{ opacity: 0, x: -30, scale: 0.9 }}
                transition={{
                  type: "spring",
                  damping: 15,
                  stiffness: 200,
                  delay: index * 0.03,
                }}
                className="flex items-start gap-3 animate-in slide-in-from-left"
              >
                <OptimizedAvatar
                  src={comment.profiles?.avatar_url || ""}
                  alt={comment.profiles?.full_name || "User"}
                  className="flex-shrink-0 w-9 h-9 ring-2 ring-white/20"
                />
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="rounded-3xl px-5 py-3 max-w-[75%] shadow-lg"
                  style={{
                    background: "rgba(0, 0, 0, 0.75)",
                    backdropFilter: "blur(16px)",
                    border: "1.5px solid rgba(255, 255, 255, 0.4)",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  <p className="text-xs font-bold text-white mb-1.5 tracking-wide drop-shadow-lg">
                    {comment.profiles?.full_name || "Anonymous"}
                  </p>
                  <p className="text-sm text-white leading-relaxed drop-shadow-lg">
                    {comment.content}
                  </p>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={commentsEndRef} />
        </div>

        {/* Input form */}
        <motion.form
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="flex items-center gap-3 pt-3"
        >
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-white/25 border-white/40 text-white placeholder:text-white/70 backdrop-blur-md rounded-full h-12 px-5 text-sm focus:ring-2 focus:ring-white/50"
            disabled={isSubmitting}
            autoComplete="off"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newComment.trim() || isSubmitting}
            className="rounded-full bg-primary hover:bg-primary/90 flex-shrink-0 h-12 w-12 shadow-lg disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </Button>
        </motion.form>
      </div>
    </motion.div>
  );
};
