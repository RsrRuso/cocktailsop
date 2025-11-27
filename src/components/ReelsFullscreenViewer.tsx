import { Heart, MessageCircle, Send, Bookmark, MoreVertical, Trash2, X, Volume2, VolumeX } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import OptimizedAvatar from "./OptimizedAvatar";

interface Reel {
  id: string;
  video_url: string;
  caption: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  user_id: string;
  created_at: string;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url: string;
    badge_level: string;
  };
}

interface ReelsFullscreenViewerProps {
  isOpen: boolean;
  onClose: () => void;
  reels: Reel[];
  initialIndex: number;
  currentUserId: string;
  likedReels: Set<string>;
  onLike: (reelId: string) => void;
  onComment: (reelId: string) => void;
  onShare: (reelId: string, caption: string, videoUrl: string) => void;
  onDelete: (reelId: string) => void;
}

export const ReelsFullscreenViewer = ({
  isOpen,
  onClose,
  reels,
  initialIndex,
  currentUserId,
  likedReels,
  onLike,
  onComment,
  onShare,
  onDelete,
}: ReelsFullscreenViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [lastTap, setLastTap] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  if (!isOpen || reels.length === 0) return null;

  const currentReel = reels[currentIndex];
  const isOwnReel = currentReel.user_id === currentUserId;

  const handlePrevious = () => {
    if (currentIndex > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentIndex(currentIndex - 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const handleNext = () => {
    if (currentIndex < reels.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentIndex(currentIndex + 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setTouchStart(e.touches[0].clientY);
    setTouchEnd(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    setTouchEnd(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    const distance = touchStart - touchEnd;
    const now = Date.now();
    
    // Double tap to like
    if (Math.abs(distance) < 10 && now - lastTap < 300) {
      onLike(currentReel.id);
      setLastTap(0);
      return;
    }
    setLastTap(now);
    
    if (Math.abs(distance) > 50) {
      if (distance > 0) {
        // Swipe up - next reel
        handleNext();
      } else {
        // Swipe down - previous reel
        handlePrevious();
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (Math.abs(e.deltaY) > 10) {
      if (e.deltaY > 0) {
        handleNext();
      } else {
        handlePrevious();
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center touch-none overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      style={{ touchAction: 'none' }}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-50 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
      >
        <X className="w-6 h-6 text-white drop-shadow-lg" />
      </button>

      {/* Video - Full screen 9:16 aspect ratio */}
      <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
        <div 
          className="w-full h-full transition-transform duration-300 ease-out"
          style={{ 
            transform: isTransitioning ? 'scale(0.95)' : 'scale(1)',
            opacity: isTransitioning ? 0.7 : 1
          }}
        >
          <video
            key={currentReel.id}
            src={currentReel.video_url}
            className="w-full h-full object-cover animate-fade-in"
            style={{ aspectRatio: '9/16', maxHeight: '100vh' }}
            loop
            playsInline
            autoPlay
            muted={isMuted}
          />
        </div>
      </div>

      {/* Mute/Unmute Button */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-4 right-4 z-50 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
      >
        {isMuted ? (
          <VolumeX className="w-6 h-6 text-white drop-shadow-lg" />
        ) : (
          <Volume2 className="w-6 h-6 text-white drop-shadow-lg" />
        )}
      </button>

      {/* User Info - Top Left */}
      <div className="absolute top-20 left-4 z-30 flex items-center gap-3">
        <OptimizedAvatar
          src={currentReel.profiles?.avatar_url}
          alt={currentReel.profiles?.username}
          className="w-10 h-10 border-2 border-white/50"
        />
        <div>
          <p className="text-white font-semibold text-sm drop-shadow-lg">
            {currentReel.profiles?.username || 'Unknown User'}
          </p>
          <p className="text-white/80 text-xs drop-shadow-lg">
            {currentReel.profiles?.full_name}
          </p>
        </div>
      </div>

      {/* Caption - Bottom positioned exactly like Instagram */}
      <div className="absolute bottom-24 left-4 right-20 z-30 space-y-2 animate-slide-in-right">
        <p className="text-white text-sm leading-relaxed drop-shadow-lg">
          {currentReel.caption.split(/(\s+)/).map((part, i) => {
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

      {/* Action Buttons - Right Side Vertical (Instagram Style) */}
      <div className="absolute right-2 bottom-24 flex flex-col gap-4 z-40">
        {/* Like Button */}
        <button
          onClick={() => onLike(currentReel.id)}
          className="flex flex-col items-center gap-0.5 transition-all active:scale-90"
        >
          <Heart
            className={`w-7 h-7 transition-colors drop-shadow-lg ${
              likedReels.has(currentReel.id) ? "fill-red-500 text-red-500" : "text-white"
            }`}
          />
          <span className="text-white text-xs font-semibold drop-shadow-lg">{currentReel.like_count || 0}</span>
        </button>

        {/* Comment Button */}
        <button
          onClick={() => onComment(currentReel.id)}
          className="flex flex-col items-center gap-0.5 transition-all active:scale-90"
        >
          <MessageCircle className="w-7 h-7 text-white drop-shadow-lg" />
          <span className="text-white text-xs font-semibold drop-shadow-lg">{currentReel.comment_count || 0}</span>
        </button>

        {/* Share/Send Button */}
        <button
          onClick={() => onShare(currentReel.id, currentReel.caption, currentReel.video_url)}
          className="flex flex-col items-center gap-0.5 transition-all active:scale-90"
        >
          <Send className="w-7 h-7 text-white drop-shadow-lg" />
        </button>

        {/* Bookmark Button */}
        <button
          className="flex flex-col items-center gap-0.5 transition-all active:scale-90"
        >
          <Bookmark className="w-7 h-7 text-white drop-shadow-lg" />
        </button>

        {/* Three Dot Menu - Only for own posts */}
        {isOwnReel && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-col items-center gap-0.5 transition-all active:scale-90">
                <MoreVertical className="w-7 h-7 text-white drop-shadow-lg" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-md border border-border/50">
              <DropdownMenuItem onClick={() => onDelete(currentReel.id)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 text-white/60 text-xs">
        {currentIndex + 1} / {reels.length}
      </div>
    </div>
  );
};
