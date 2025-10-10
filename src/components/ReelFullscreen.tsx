import { Heart, MessageCircle, Send, Bookmark, MoreVertical, Edit, Trash2, X, Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ReelFullscreenProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  postId: string;
  postType: 'post' | 'reel';
  content: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isOwnPost: boolean;
  userId: string;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const ReelFullscreen = ({
  isOpen,
  onClose,
  videoUrl,
  likeCount,
  commentCount,
  isLiked,
  isOwnPost,
  onLike,
  onComment,
  onShare,
  onEdit,
  onDelete,
}: ReelFullscreenProps) => {
  const [isMuted, setIsMuted] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Video */}
      <video
        src={videoUrl}
        className="w-full h-full object-contain"
        loop
        playsInline
        autoPlay
        muted={isMuted}
      />

      {/* Mute/Unmute Button */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-4 right-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all z-50"
      >
        {isMuted ? (
          <VolumeX className="w-6 h-6 text-white" />
        ) : (
          <Volume2 className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Action Buttons - Right Side Vertical */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-40">
        {/* Like Button */}
        <button
          onClick={onLike}
          className="flex flex-col items-center gap-1 transition-all hover:scale-110"
        >
          <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70">
            <Heart
              className={`w-7 h-7 ${
                isLiked ? "fill-red-500 text-red-500" : "text-white"
              }`}
            />
          </div>
          <span className="text-white text-sm font-bold">{likeCount || 0}</span>
        </button>

        {/* Comment Button */}
        <button
          onClick={onComment}
          className="flex flex-col items-center gap-1 transition-all hover:scale-110"
        >
          <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-sm font-bold">{commentCount || 0}</span>
        </button>

        {/* Share/Send Button */}
        <button
          onClick={onShare}
          className="flex flex-col items-center gap-1 transition-all hover:scale-110"
        >
          <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70">
            <Send className="w-7 h-7 text-white" />
          </div>
        </button>

        {/* Bookmark Button */}
        <button
          className="flex flex-col items-center gap-1 transition-all hover:scale-110"
        >
          <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70">
            <Bookmark className="w-7 h-7 text-white" />
          </div>
        </button>

        {/* Three Dot Menu - Only for own posts */}
        {isOwnPost && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-col items-center gap-1 transition-all hover:scale-110">
                <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70">
                  <MoreVertical className="w-7 h-7 text-white" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};
