import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    full_name: string;
  };
}

interface StoryCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
}

const StoryCommentsDialog = ({ open, onOpenChange, storyId }: StoryCommentsDialogProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const touchStartY = useRef(0);

  useEffect(() => {
    if (open) {
      loadComments();

      // Subscribe to new comments
      const channel = supabase
        .channel(`story-comments-${storyId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'story_comments',
            filter: `story_id=eq.${storyId}`
          },
          () => {
            loadComments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, storyId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("story_comments")
        .select(`
          id,
          user_id,
          content,
          created_at,
          profiles (username, avatar_url, full_name)
        `)
        .eq("story_id", storyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setComments(data as any || []);
    } catch (error) {
      console.error("Error loading comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;
    if (!user?.id) {
      toast.error("Please login to comment");
      return;
    }

    setSubmitting(true);
    const content = newComment.trim();
    setNewComment("");

    try {
      const { error } = await supabase
        .from("story_comments")
        .insert({
          story_id: storyId,
          user_id: user.id,
          content
        });

      if (error) throw error;
      
      // Successfully posted
      toast.success("Comment posted!");
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
      setNewComment(content);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diffY = touchStartY.current - touchEndY;
    const threshold = 100;

    // Swipe down to close
    if (diffY < -threshold) {
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <motion.div 
      className="fixed inset-0 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Semi-transparent backdrop */}
      <div 
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Comments bottom sheet - stop all touch events from bubbling */}
      <motion.div 
        className="absolute bottom-0 left-0 right-0 pointer-events-auto"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle - only this triggers swipe down to close */}
        <div 
          className="flex justify-center py-3 cursor-grab"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-white/40 rounded-full" />
        </div>
        
        {/* Close button */}
        <Button
          onClick={() => onOpenChange(false)}
          variant="ghost"
          size="icon"
          className="absolute top-2 right-4 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white z-10"
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Comments list - scrolling here won't affect story */}
        <div 
          className="max-h-[50vh] overflow-y-auto space-y-2 pb-4 px-4 scrollbar-hide"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <AnimatePresence mode="popLayout">
            {comments.slice(-10).reverse().map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="bg-black/60 backdrop-blur-md rounded-2xl px-3 py-2 max-w-[85%]"
              >
                <div className="flex items-start gap-2">
                  <Avatar className="w-7 h-7 flex-shrink-0 ring-2 ring-white/20">
                    <AvatarImage src={comment.profiles.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-white/20 text-white">
                      {comment.profiles.username[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-xs text-white truncate">
                        {comment.profiles.username}
                      </p>
                      <span className="text-[10px] text-white/50">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-white break-words leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input area */}
        <form onSubmit={handleSubmit} className="flex gap-2 items-center mt-3">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            disabled={submitting}
            className="flex-1 bg-black/60 backdrop-blur-md border-white/20 text-white placeholder:text-white/50 focus:border-white/40 rounded-full px-4 h-11"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={submitting || !newComment.trim()}
            className="h-11 w-11 rounded-full bg-white text-black hover:bg-white/90 flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default StoryCommentsDialog;
