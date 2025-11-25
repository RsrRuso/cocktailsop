import { Heart, MessageCircle, Share2, Users, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface EngagementButtonsProps {
  likeCount: number;
  commentCount: number;
  shareCount?: number;
  attendeeCount?: number;
  isLiked: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare?: () => void;
  onViewLikes: () => void;
  onViewAttendees?: () => void;
  onAIInsights?: () => void;
  className?: string;
  variant?: 'default' | 'compact' | 'minimal';
}

export const EngagementButtons = ({
  likeCount,
  commentCount,
  shareCount,
  attendeeCount,
  isLiked,
  onLike,
  onComment,
  onShare,
  onViewLikes,
  onViewAttendees,
  onAIInsights,
  className,
  variant = 'default'
}: EngagementButtonsProps) => {
  const [likeAnimation, setLikeAnimation] = useState(false);

  const handleLike = () => {
    if (!isLiked) {
      setLikeAnimation(true);
      setTimeout(() => setLikeAnimation(false), 600);
    }
    onLike();
  };

  const buttonSize = variant === 'compact' ? 'sm' : variant === 'minimal' ? 'sm' : 'default';

  return (
    <div className={cn(
      "flex items-center gap-1 flex-wrap",
      variant === 'minimal' && "gap-0.5",
      className
    )}>
      {/* Like Button */}
      <motion.div className="relative">
        <Button
          variant="ghost"
          size={buttonSize}
          onClick={handleLike}
          className={cn(
            "gap-1.5 group hover:scale-105 transition-all duration-200",
            isLiked && "text-red-500"
          )}
          aria-label={isLiked ? "Unlike" : "Like"}
        >
          <motion.div
            animate={likeAnimation ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.4 }}
          >
            <Heart 
              className={cn(
                "w-5 h-5 transition-all duration-200",
                isLiked && "fill-red-500",
                "group-hover:scale-110"
              )}
            />
          </motion.div>
          <motion.span 
            className="font-semibold tabular-nums"
            key={likeCount}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {likeCount}
          </motion.span>
        </Button>
        
        <AnimatePresence>
          {likeAnimation && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ scale: 0.8, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Heart className="w-5 h-5 fill-red-500 text-red-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* View Likes Button */}
      {likeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewLikes}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
        </Button>
      )}

      {/* Comment Button */}
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={onComment}
        className="gap-1.5 hover:scale-105 transition-all duration-200 group"
        aria-label="Comment"
      >
        <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
        <span className="font-semibold tabular-nums">{commentCount}</span>
      </Button>

      {/* Share Button */}
      {onShare && shareCount !== undefined && (
        <Button
          variant="ghost"
          size={buttonSize}
          onClick={onShare}
          className="gap-1.5 hover:scale-105 transition-all duration-200 group"
          aria-label="Share"
        >
          <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="font-semibold tabular-nums">{shareCount}</span>
        </Button>
      )}

      {/* Attendees Button */}
      {onViewAttendees && attendeeCount !== undefined && (
        <Button
          variant="ghost"
          size={buttonSize}
          onClick={onViewAttendees}
          className="gap-1.5 hover:scale-105 transition-all duration-200 group"
          aria-label="View attendees"
        >
          <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="font-semibold tabular-nums">{attendeeCount}</span>
        </Button>
      )}

      {/* AI Insights Button */}
      {onAIInsights && (
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="outline"
            size={buttonSize}
            onClick={onAIInsights}
            className="gap-1.5 border-2 border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 transition-all duration-200"
            aria-label="AI Insights"
          >
            <Sparkles className="w-4 h-4" />
            <span className="font-semibold text-xs sm:text-sm">AI Insights</span>
            <Sparkles className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};
