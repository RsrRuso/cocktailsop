import { Heart, MessageCircle, Send, Bookmark, MoreVertical, Edit, Trash2, X, Volume2, VolumeX, Music } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const QUICK_REACTIONS = ['❤️', '🔥', '👏', '😍', '😮', '😢'];

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
  musicUrl?: string;
  musicTitle?: string;
  musicArtist?: string;
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
  musicUrl,
  musicTitle,
  musicArtist,
  onLike,
  onComment,
  onShare,
  onEdit,
  onDelete,
}: ReelFullscreenProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [flyingEmoji, setFlyingEmoji] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTapRef = useRef(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  // Auto-unmute when opening fullscreen
  useEffect(() => {
    if (isOpen) {
      setIsMuted(false);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.muted = musicUrl ? true : false;
          videoRef.current.play().catch(() => {});
        }
        if (audioRef.current) {
          audioRef.current.muted = false;
          audioRef.current.play().catch(() => {});
        }
      }, 100);
    }
  }, [isOpen, musicUrl]);

  // Handle audio mute sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Double tap to like
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!isLiked) {
        onLike();
      }
      setShowHeartAnimation(true);
      if ('vibrate' in navigator) navigator.vibrate(50);
      setTimeout(() => setShowHeartAnimation(false), 1000);
    }
    lastTapRef.current = now;
  }, [isLiked, onLike]);

  // Long press for reactions
  const handleTouchStart = useCallback(() => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setShowReactions(true);
      if ('vibrate' in navigator) navigator.vibrate([30, 20, 30]);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      handleDoubleTap();
    }
  }, [handleDoubleTap]);

  const handleTouchMove = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleReaction = (emoji: string) => {
    setFlyingEmoji(emoji);
    setShowReactions(false);
    toast.success(`Reacted with ${emoji}`);
    if ('vibrate' in navigator) navigator.vibrate(30);
    setTimeout(() => setFlyingEmoji(null), 800);
  };

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

      {/* Video - Full screen 9:16 aspect ratio with touch handlers */}
      <div 
        className="relative w-full h-full flex items-center justify-center bg-black"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-cover"
          style={{ aspectRatio: '9/16', maxHeight: '100vh' }}
          loop
          playsInline
          autoPlay
          muted={musicUrl ? true : isMuted}
        />
        
        {/* Double tap heart animation */}
        <AnimatePresence>
          {showHeartAnimation && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
            >
              <Heart className="w-32 h-32 text-white fill-white drop-shadow-2xl" strokeWidth={1} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Flying emoji animation */}
        <AnimatePresence>
          {flyingEmoji && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 0 }}
              animate={{ scale: 1.3, opacity: 1, y: -60 }}
              exit={{ scale: 0.5, opacity: 0, y: -120 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
            >
              <span className="text-7xl drop-shadow-2xl">{flyingEmoji}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Long press reactions popup */}
        <AnimatePresence>
          {showReactions && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 z-40"
                onClick={() => setShowReactions(false)}
              />
              <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
              >
                <div className="flex items-center gap-2 bg-background/95 backdrop-blur-xl rounded-full px-3 py-2 shadow-2xl border border-white/10">
                  {QUICK_REACTIONS.map((emoji, index) => (
                    <motion.button
                      key={emoji}
                      initial={{ scale: 0, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ delay: index * 0.05, type: "spring", damping: 15 }}
                      whileHover={{ scale: 1.3, y: -8 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleReaction(emoji)}
                      className="w-12 h-12 flex items-center justify-center text-3xl hover:bg-white/10 rounded-full transition-colors"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        
        {/* Audio element for attached music */}
        {musicUrl && (
          <audio
            ref={audioRef}
            src={musicUrl}
            loop
            autoPlay
            muted={isMuted}
            preload="auto"
          />
        )}
        
        {/* Music indicator */}
        {musicUrl && (
          <div className="absolute bottom-24 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 z-20">
            <Music className="w-4 h-4 text-white animate-pulse" />
            <div className="max-w-[150px]">
              <p className="text-xs text-white font-medium truncate">{musicTitle || 'Music'}</p>
              {musicArtist && <p className="text-[10px] text-white/70 truncate">{musicArtist}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Mute/Unmute Button */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-4 right-4 z-50 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
      >
        {isMuted ? (
          <VolumeX className="w-7 h-7 text-white drop-shadow-lg" />
        ) : (
          <Volume2 className="w-7 h-7 text-white drop-shadow-lg" />
        )}
      </button>

      {/* Caption - Bottom positioned */}
      <div className="absolute bottom-20 left-4 right-20 z-30 space-y-2 animate-slide-in-right">
        <p className="text-white text-sm leading-relaxed drop-shadow-lg">
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

      {/* Instagram-style Action Buttons - Right Side Vertical */}
      <div className="absolute right-4 bottom-28 flex flex-col items-center gap-5 z-40">
        {/* Like Button */}
        <button
          onClick={onLike}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
        >
          <Heart
            className={`w-7 h-7 drop-shadow-lg ${
              isLiked ? "fill-red-500 text-red-500" : "text-white"
            }`}
            strokeWidth={1.5}
          />
          <span className="text-white text-xs font-semibold drop-shadow-lg">{likeCount || 0}</span>
        </button>

        {/* Comment Button */}
        <button
          onClick={onComment}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
        >
          <MessageCircle className="w-7 h-7 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white text-xs font-semibold drop-shadow-lg">{commentCount || 0}</span>
        </button>

        {/* Share/Send Button */}
        <button
          onClick={onShare}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
        >
          <Send className="w-6 h-6 text-white drop-shadow-lg" strokeWidth={1.5} />
        </button>

        {/* Bookmark Button */}
        <button className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
          <Bookmark className="w-7 h-7 text-white drop-shadow-lg" strokeWidth={1.5} />
        </button>

        {/* Three Dot Menu - Only for own posts */}
        {isOwnPost && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-col items-center active:scale-90 transition-transform">
                <MoreVertical className="w-6 h-6 text-white drop-shadow-lg" strokeWidth={1.5} />
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
