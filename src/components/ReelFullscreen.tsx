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
  content,
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
        className="absolute top-4 left-4 z-50 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
      >
        <X className="w-7 h-7 text-white drop-shadow-lg" />
      </button>

      {/* Video - Full screen 9:16 aspect ratio */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        <video
          src={videoUrl}
          className="w-full h-full object-cover"
          style={{ aspectRatio: '9/16', maxHeight: '100vh' }}
          loop
          playsInline
          autoPlay
          muted={isMuted}
        />
      </div>

      {/* Mute/Unmute Button */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-3 sm:top-4 right-3 sm:right-4 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-all"
      >
        {isMuted ? (
          <VolumeX className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-lg" />
        ) : (
          <Volume2 className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-lg" />
        )}
      </button>

      {/* Caption - Bottom positioned */}
      <div className="absolute bottom-20 sm:bottom-24 left-4 right-20 z-30 space-y-2 animate-slide-in-right">
        <p className="text-white text-sm sm:text-base leading-relaxed drop-shadow-lg">
          {content.split(/(\s+)/).map((part, i) => {
            if (part.startsWith('#')) {
              return <span key={i} className="text-blue-400 font-semibold">{part}</span>;
            }
            if (part.startsWith('@')) {
              return <span key={i} className="text-blue-400 font-semibold">{part}</span>;
            }
            return <span key={i}>{part}</span>;
          })}
        </p>
      </div>

      {/* Action Buttons - Right Side Vertical */}
      <div className="absolute right-2 sm:right-3 bottom-20 sm:bottom-24 flex flex-col gap-5 sm:gap-6 z-40">
        {/* Like Button */}
        <button
          onClick={onLike}
          className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/50 backdrop-blur-md border-2 border-white/30 flex items-center justify-center active:border-white/50 active:bg-white/10 transition-all">
            <Heart
              className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                isLiked ? "fill-red-500 text-red-500" : "text-white"
              }`}
            />
          </div>
          <span className="text-white text-sm sm:text-base font-bold drop-shadow-lg">{likeCount || 0}</span>
        </button>

        {/* Comment Button */}
        <button
          onClick={onComment}
          className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/50 backdrop-blur-md border-2 border-white/30 flex items-center justify-center active:border-white/50 active:bg-white/10 transition-all">
            <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <span className="text-white text-sm sm:text-base font-bold drop-shadow-lg">{commentCount || 0}</span>
        </button>

        {/* Share/Send Button */}
        <button
          onClick={onShare}
          className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/50 backdrop-blur-md border-2 border-white/30 flex items-center justify-center active:border-white/50 active:bg-white/10 transition-all">
            <Send className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
        </button>

        {/* Bookmark Button */}
        <button
          className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/50 backdrop-blur-md border-2 border-white/30 flex items-center justify-center active:border-white/50 active:bg-white/10 transition-all">
            <Bookmark className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
        </button>

        {/* Three Dot Menu - Only for own posts */}
        {isOwnPost && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-col items-center gap-1 active:scale-95 transition-transform">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/50 backdrop-blur-md border-2 border-white/30 flex items-center justify-center active:border-white/50 active:bg-white/10 transition-all">
                  <MoreVertical className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-md border border-border/50">
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
