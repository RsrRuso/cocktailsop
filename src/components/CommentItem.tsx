import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Reply, Heart } from 'lucide-react';
import OptimizedAvatar from './OptimizedAvatar';

interface Reaction {
  emoji: string;
  user_id: string;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  event_id: string;
  parent_comment_id: string | null;
  created_at: string;
  reactions: Reaction[] | null;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface CommentItemProps {
  comment: Comment;
  isReply?: boolean;
  currentUserId: string | null;
  isEditing: boolean;
  editContent: string;
  setEditContent: (content: string) => void;
  onEdit: (commentId: string) => void;
  onSaveEdit: (commentId: string) => void;
  onCancelEdit: () => void;
  onDelete: (commentId: string) => void;
  onDoubleTapLike: (commentId: string) => void;
  onSwipeReply: (commentId: string) => void;
  showHeartAnimation: boolean;
}

export const CommentItem = ({
  comment,
  isReply = false,
  currentUserId,
  isEditing,
  editContent,
  setEditContent,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onDoubleTapLike,
  onSwipeReply,
  showHeartAnimation,
}: CommentItemProps) => {
  const x = useMotionValue(0);
  const replyOpacity = useTransform(x, [0, 80], [0, 1]);
  const likeOpacity = useTransform(x, [-80, 0], [1, 0]);

  const isOwner = comment.user_id === currentUserId;
  const reactions = comment.reactions || [];
  const likeCount = reactions.filter(r => r.emoji === '❤️').length;
  const hasLiked = reactions.some(r => r.user_id === currentUserId && r.emoji === '❤️');

  let lastTapTime = 0;

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapTime < 300) {
      onDoubleTapLike(comment.id);
      lastTapTime = 0;
    } else {
      lastTapTime = now;
    }
  };

  const handleSwipeEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 80) {
      onSwipeReply(comment.id);
    } else if (info.offset.x < -80) {
      onDoubleTapLike(comment.id);
    }
  };

  return (
    <div className={`relative ${isReply ? 'ml-10 mt-3' : ''}`}>
      {/* Swipe indicators */}
      <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
        <motion.div style={{ opacity: replyOpacity }} className="text-primary">
          <Reply className="w-5 h-5" />
        </motion.div>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <motion.div style={{ opacity: likeOpacity }} className="text-red-500">
          <Heart className="w-5 h-5 fill-current" />
        </motion.div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleSwipeEnd}
        onClick={handleTap}
        style={{ x }}
        className="flex gap-3 bg-transparent relative z-10 py-2"
      >
        <OptimizedAvatar
          src={comment.profiles?.avatar_url}
          alt={comment.profiles?.username || 'User'}
          className="w-9 h-9"
          showStatus={false}
          userId={comment.user_id}
          showOnlineIndicator={true}
        />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-white">
              {comment.profiles?.username || 'Anonymous'}
            </span>
            <span className="text-[10px] text-white/40">
              {new Date(comment.created_at).toLocaleDateString()}
            </span>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[60px] bg-white/5 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none"
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => onSaveEdit(comment.id)}
                  className="px-3 py-1.5 bg-white text-black text-xs font-medium rounded-full"
                >
                  Save
                </button>
                <button
                  onClick={onCancelEdit}
                  className="px-3 py-1.5 bg-white/10 text-white/70 text-xs rounded-full"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-white/90 leading-relaxed">{comment.content}</p>
              
              <div className="flex items-center gap-4 pt-1">
                {likeCount > 0 && (
                  <span className={`text-xs ${hasLiked ? 'text-red-400' : 'text-white/40'}`}>
                    ❤️ {likeCount}
                  </span>
                )}
                
                {isOwner && (
                  <div className="flex items-center gap-3 ml-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(comment.id);
                      }}
                      className="text-[10px] text-white/40"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(comment.id);
                      }}
                      className="text-[10px] text-red-400/60"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <AnimatePresence>
          {showHeartAnimation && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <Heart className="w-12 h-12 text-red-500 fill-current" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
