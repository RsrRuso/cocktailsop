import { Heart, MessageCircle, Send, Bookmark, MoreVertical, Trash2, X, Volume2, VolumeX, Music } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import OptimizedAvatar from "./OptimizedAvatar";
import { ReelLivestreamComments } from "./ReelLivestreamComments";

interface Reel {
  id: string;
  video_url: string;
  caption: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  user_id: string;
  created_at: string;
  music_url?: string | null;
  music_track_id?: string | null;
  mute_original_audio?: boolean | null;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url: string;
    badge_level: string;
  };
  music_tracks?: {
    title: string;
    preview_url: string | null;
    profiles?: {
      username: string;
    } | null;
  } | null;
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
  const [lastTap, setLastTap] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const y = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);

  // Handle music playback synchronized with video
  useEffect(() => {
    const currentReel = reels[currentIndex];
    const musicUrl = currentReel?.music_url || currentReel?.music_tracks?.preview_url;
    
    // Stop any current music
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current = null;
    }
    
    // Start music if reel has music
    if (musicUrl && isOpen) {
      const audio = new Audio(musicUrl);
      audio.loop = true;
      audio.volume = isMuted ? 0 : 1;
      musicAudioRef.current = audio;
      
      // Play music when video starts
      audio.play().catch(console.error);
    }
    
    return () => {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current = null;
      }
    };
  }, [currentIndex, isOpen, reels]);

  // Sync music volume with mute state
  useEffect(() => {
    if (musicAudioRef.current) {
      musicAudioRef.current.volume = isMuted ? 0 : 1;
    }
  }, [isMuted]);

  // Preload adjacent videos
  const preloadVideos = useCallback(() => {
    // Preload current, next, and previous videos
    [currentIndex - 1, currentIndex, currentIndex + 1].forEach(idx => {
      if (idx >= 0 && idx < reels.length) {
        const videoEl = videoRefs.current.get(idx);
        if (videoEl) {
          videoEl.load();
        }
      }
    });
  }, [currentIndex, reels.length]);

  useEffect(() => {
    setCurrentIndex(initialIndex);

    const html = document.documentElement;
    const body = document.body;
    
    if (isOpen) {
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      html.style.scrollbarWidth = "none";
      body.style.scrollbarWidth = "none";
      preloadVideos();
    } else {
      html.style.overflow = "";
      body.style.overflow = "";
      html.style.scrollbarWidth = "";
      body.style.scrollbarWidth = "";
    }

    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
      html.style.scrollbarWidth = "";
      body.style.scrollbarWidth = "";
    };
  }, [initialIndex, isOpen, preloadVideos]);

  // Preload adjacent videos when index changes
  useEffect(() => {
    if (isOpen) {
      preloadVideos();
    }
  }, [currentIndex, isOpen, preloadVideos]);

  if (!isOpen || reels.length === 0) return null;

  const currentReel = reels[currentIndex];
  const isOwnReel = currentReel.user_id === currentUserId;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(currentIndex - 1);
    }
  };
 
  const handleNext = () => {
    if (currentIndex < reels.length - 1) {
      setDirection(1);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    const offsetThreshold = 50;
    const velocityThreshold = 300;
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    // Fast flicks based on velocity with smoother threshold
    if (Math.abs(velocity) > velocityThreshold) {
      if (velocity < 0 && currentIndex < reels.length - 1) {
        // Swipe up -> next reel
        setDirection(1);
        setCurrentIndex(currentIndex + 1);
      } else if (velocity > 0 && currentIndex > 0) {
        // Swipe down -> previous reel
        setDirection(-1);
        setCurrentIndex(currentIndex - 1);
      }
      return;
    }

    // Slower drags based on distance with better sensitivity
    if (Math.abs(offset) > offsetThreshold) {
      if (offset < 0 && currentIndex < reels.length - 1) {
        // Drag up -> next reel
        setDirection(1);
        setCurrentIndex(currentIndex + 1);
      } else if (offset > 0 && currentIndex > 0) {
        // Drag down -> previous reel
        setDirection(-1);
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      onLike(currentReel.id);
      setLastTap(0);
      return;
    }
    setLastTap(now);
  };

  return (
    <motion.div 
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ 
        duration: 0.2,
        ease: "easeInOut"
      }}
      style={{ 
        overflow: 'hidden',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Close Button with Smooth Bounce */}
      <motion.button
        onClick={onClose}
        className="absolute top-4 left-4 z-50 flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.85 }}
        transition={{ type: "spring", stiffness: 500, damping: 15 }}
      >
        <X className="w-6 h-6 text-white drop-shadow-lg" />
      </motion.button>

      {/* Video Container with Smooth Transitions */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={currentIndex}
          className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.15}
          dragMomentum={true}
          dragTransition={{ 
            power: 0.4,
            timeConstant: 250,
            modifyTarget: (target) => Math.round(target / window.innerHeight) * window.innerHeight 
          }}
          onDragEnd={handleDragEnd}
          onClick={handleDoubleTap}
          initial={{ 
            y: direction === 1 ? "100%" : "-100%", 
            scale: 1,
            opacity: 0 
          }}
          animate={{ 
            y: 0, 
            scale: 1,
            opacity: 1 
          }}
          exit={{ 
            y: direction === 1 ? "-100%" : "100%", 
            scale: 1,
            opacity: 0 
          }}
          transition={{
            type: "spring",
            stiffness: 250,
            damping: 28,
            mass: 0.7,
            restDelta: 0.001,
            restSpeed: 0.001
          }}
          style={{ 
            touchAction: 'pan-y',
            overflow: 'hidden'
          }}
        >
          <video
            key={currentReel.id}
            ref={(el) => {
              if (el) videoRefs.current.set(currentIndex, el);
            }}
            src={currentReel.video_url}
            className="w-full h-full object-cover"
            style={{ aspectRatio: '9/16', maxHeight: '100vh' }}
            loop
            playsInline
            autoPlay
            muted={isMuted || Boolean(currentReel.mute_original_audio && currentReel.music_url)}
            preload="auto"
          />
        </motion.div>
      </AnimatePresence>

      {/* Hidden preload videos for adjacent reels */}
      {currentIndex > 0 && (
        <video
          ref={(el) => {
            if (el) videoRefs.current.set(currentIndex - 1, el);
          }}
          src={reels[currentIndex - 1].video_url}
          className="hidden"
          preload="auto"
          muted
        />
      )}
      {currentIndex < reels.length - 1 && (
        <video
          ref={(el) => {
            if (el) videoRefs.current.set(currentIndex + 1, el);
          }}
          src={reels[currentIndex + 1].video_url}
          className="hidden"
          preload="auto"
          muted
        />
      )}

      {/* Mute/Unmute Button with Smooth Bounce */}
      <motion.button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-4 right-4 z-50 flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.85 }}
        transition={{ type: "spring", stiffness: 500, damping: 15 }}
      >
        {isMuted ? (
          <VolumeX className="w-6 h-6 text-white drop-shadow-lg" />
        ) : (
          <Volume2 className="w-6 h-6 text-white drop-shadow-lg" />
        )}
      </motion.button>

      {/* User Info - Top Left with Smooth Entry */}
      <motion.div 
        className="absolute top-20 left-4 z-30 flex items-center gap-3"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ 
          delay: 0.15,
          type: "spring",
          stiffness: 300,
          damping: 25
        }}
      >
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
      </motion.div>

      {/* Caption and Music - Bottom with Smooth Slide Up */}
      <motion.div 
        className="absolute bottom-24 left-4 right-20 z-30 space-y-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          delay: 0.2,
          type: "spring",
          stiffness: 300,
          damping: 25
        }}
      >
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
        
        {/* Music indicator */}
        {(currentReel.music_url || currentReel.music_tracks) && (
          <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 w-fit">
            <Music className="w-3 h-3 text-white animate-pulse" />
            <span className="text-white text-xs font-medium truncate max-w-[180px]">
              {currentReel.music_tracks?.title || 'Added Music'}
            </span>
            {currentReel.music_tracks?.profiles?.username && (
              <span className="text-white/70 text-xs">
                • @{currentReel.music_tracks.profiles.username}
              </span>
            )}
          </div>
        )}
      </motion.div>

      {/* Action Buttons - Right Side with Smooth Slide In */}
      <motion.div 
        className="absolute right-2 bottom-24 flex flex-col gap-4 z-40"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ 
          delay: 0.15,
          type: "spring",
          stiffness: 300,
          damping: 25
        }}
      >
        {/* Like Button with Bounce */}
        <motion.button
          onClick={() => onLike(currentReel.id)}
          className="flex flex-col items-center gap-0.5"
          whileTap={{ scale: 0.8 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
        >
          <Heart
            className={`w-7 h-7 transition-colors drop-shadow-lg ${
              likedReels.has(currentReel.id) ? "fill-red-500 text-red-500" : "text-white"
            }`}
          />
          <span className="text-white text-xs font-semibold drop-shadow-lg">{currentReel.like_count || 0}</span>
        </motion.button>

        {/* Comment Button with Bounce */}
        <motion.button
          onClick={() => onComment(currentReel.id)}
          className="flex flex-col items-center gap-0.5"
          whileTap={{ scale: 0.8 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
        >
          <MessageCircle className="w-7 h-7 text-white drop-shadow-lg" />
          <span className="text-white text-xs font-semibold drop-shadow-lg">{currentReel.comment_count || 0}</span>
        </motion.button>

        {/* Share/Send Button with Bounce */}
        <motion.button
          onClick={() => onShare(currentReel.id, currentReel.caption, currentReel.video_url)}
          className="flex flex-col items-center gap-0.5"
          whileTap={{ scale: 0.8 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
        >
          <Send className="w-7 h-7 text-white drop-shadow-lg" />
        </motion.button>

        {/* Bookmark Button with Bounce */}
        <motion.button
          className="flex flex-col items-center gap-0.5"
          whileTap={{ scale: 0.8 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
        >
          <Bookmark className="w-7 h-7 text-white drop-shadow-lg" />
        </motion.button>

        {/* Three Dot Menu - Only for own posts */}
        {isOwnReel && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button 
                className="flex flex-col items-center gap-0.5"
                whileTap={{ scale: 0.8 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
              >
                <MoreVertical className="w-7 h-7 text-white drop-shadow-lg" />
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-md border border-border/50">
              <DropdownMenuItem onClick={() => onDelete(currentReel.id)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </motion.div>

      {/* Livestream Comments Overlay - Always visible in fullscreen */}
      {currentReel && (
        <ReelLivestreamComments key={currentReel.id} reelId={currentReel.id} />
      )}
    </motion.div>
  );
};
