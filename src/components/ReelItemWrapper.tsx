import { FC, useState, useEffect, useRef, useCallback } from 'react';
import { Heart, MessageCircle, Send, MoreVertical, Music, Trash2, Edit, Volume2, VolumeX, Bookmark, Loader2 } from 'lucide-react';
import OptimizedAvatar from '@/components/OptimizedAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useViewTracking } from '@/hooks/useViewTracking';

interface ReelItemWrapperProps {
  reel: any;
  index: number;
  currentIndex: number;
  user: any;
  mutedVideos: Set<string>;
  likedReels: Set<string>;
  setMutedVideos: (fn: (prev: Set<string>) => Set<string>) => void;
  handleLikeReel: (reelId: string) => void;
  setSelectedReelForLikes: (reelId: string) => void;
  setShowLikes: (show: boolean) => void;
  setSelectedReelForComments: (reelId: string) => void;
  setShowComments: (show: boolean) => void;
  setSelectedReelId: (reelId: string) => void;
  setSelectedReelCaption: (caption: string) => void;
  setSelectedReelVideo: (video: string) => void;
  setShowShare: (show: boolean) => void;
  navigate: (path: string) => void;
  handleDeleteReel: (reelId: string) => void;
}

export const ReelItemWrapper: FC<ReelItemWrapperProps> = ({
  reel,
  index,
  currentIndex,
  user,
  mutedVideos,
  likedReels,
  setMutedVideos,
  handleLikeReel,
  setSelectedReelForLikes,
  setShowLikes,
  setSelectedReelForComments,
  setShowComments,
  setSelectedReelId,
  setSelectedReelCaption,
  setSelectedReelVideo,
  setShowShare,
  navigate,
  handleDeleteReel,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Track view when this reel is visible
  useViewTracking('reel', reel.id, user?.id, index === currentIndex);

  // Attached music (prefer track.original_url)
  const musicUrl = reel.music_tracks?.original_url || reel.music_tracks?.preview_url || reel.music_url;
  const hasAttachedMusic = Boolean(musicUrl);

  const isImageReel = reel.is_image_reel === true;

  // Video should be muted if: has music AND mute_original_audio is true
  const shouldMuteVideo = hasAttachedMusic && reel.mute_original_audio === true;
  // Global mute state is controlled by the user
  const isUserMuted = mutedVideos.has(reel.id);

  // Reset loading state when video URL changes
  useEffect(() => {
    setIsVideoLoaded(false);
  }, [reel.video_url]);

  // Preload adjacent videos aggressively (skip for image reels)
  useEffect(() => {
    if (isImageReel) return;
    if (videoRef.current && Math.abs(index - currentIndex) <= 2) {
      videoRef.current.load();
    }
  }, [index, currentIndex, isImageReel]);

  // Handle audio ready state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !hasAttachedMusic) return;

    const handleCanPlay = () => setAudioReady(true);
    audio.addEventListener('canplay', handleCanPlay);
    
    // Try to load the audio
    audio.load();
    
    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [hasAttachedMusic, musicUrl]);

  // Play/pause media based on visibility
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    const isActive = index === currentIndex;

    if (isActive) {
      if (!isImageReel) {
        // Video autoplay must be muted on mobile (handled via mutedVideos state)
        video?.play().catch(() => {});
      }

      if (hasAttachedMusic && audio && musicUrl && !isUserMuted) {
        // Sync audio to current video time when possible
        const t = !isImageReel ? (video?.currentTime || 0) : 0;
        try {
          audio.currentTime = Number.isFinite(t) ? t : 0;
        } catch {
          // ignore
        }
        audio.muted = false;
        audio.play().catch(() => {
          // Mobile browsers may require explicit user interaction before audio can play.
        });
      } else if (audio) {
        audio.pause();
      }
    } else {
      video?.pause();
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    }
  }, [index, currentIndex, hasAttachedMusic, musicUrl, isUserMuted, isImageReel]);

  // Sync audio mute state with user preference
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isUserMuted;
    }
  }, [isUserMuted]);

  // Sync video mute - mute if has attached music with mute flag OR user manually muted
  useEffect(() => {
    if (isImageReel) return;
    if (videoRef.current) {
      videoRef.current.muted = shouldMuteVideo || isUserMuted;
    }
  }, [shouldMuteVideo, isUserMuted, isImageReel]);

  // Parse caption for hashtags and mentions
  const renderCaption = (text: string) => {
    const parts = text.split(/(\s+)/);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return <span key={i} className="text-blue-400 font-semibold">{part}</span>;
      }
      if (part.startsWith('@')) {
        return <span key={i} className="text-blue-400 font-semibold">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="h-screen snap-start relative bg-black">
      {/* Loading spinner - shows while video is loading */}
      {!isImageReel && !isVideoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black">
          <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
        </div>
      )}
      
      {/* Full Screen Media */}
      {isImageReel ? (
        <img
          src={reel.video_url}
          alt={reel.caption ? `Reel image: ${reel.caption}` : "Reel image"}
          className="absolute inset-0 w-full h-full object-cover"
          loading={Math.abs(index - currentIndex) <= 2 ? "eager" : "lazy"}
        />
      ) : (
        <video
          ref={videoRef}
          src={reel.video_url}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ backgroundColor: 'black' }}
          loop
          playsInline
          autoPlay
          muted={shouldMuteVideo || isUserMuted}
          preload={Math.abs(index - currentIndex) <= 2 ? "auto" : "metadata"}
          onLoadedData={() => setIsVideoLoaded(true)}
          onCanPlay={() => setIsVideoLoaded(true)}
        />
      )}

      {/* Audio element for attached music */}
      {hasAttachedMusic && musicUrl && (
        <audio
          ref={audioRef}
          src={musicUrl}
          loop
          muted={isUserMuted}
          preload="auto"
        />
      )}

       {/* Mute/Unmute Button - Top Right */}
       <button
         onClick={(e) => {
           e.stopPropagation();
           setMutedVideos((prev) => {
             const next = new Set(prev);
             const wasMuted = next.has(reel.id);
             if (wasMuted) next.delete(reel.id);
             else next.add(reel.id);

             // If user just unmuted the currently visible reel, try to start playback (needed on iOS)
             if (wasMuted && index === currentIndex) {
               const video = videoRef.current;
               const audio = audioRef.current;
               video?.play().catch(() => {});
               if (audio && musicUrl) {
                 audio.muted = false;
                 audio.play().catch(() => {});
               }
             }

             return next;
           });
         }}
         className="absolute top-4 right-4 z-30 flex items-center justify-center hover:scale-110 transition-all active:scale-90"
       >
         {mutedVideos.has(reel.id) ? (
           <VolumeX className="w-7 h-7 text-white drop-shadow-lg" />
         ) : (
           <Volume2 className="w-7 h-7 text-white drop-shadow-lg" />
         )}
       </button>

      {/* Right Side Action Buttons - Instagram Style */}
      <div className="absolute right-3 bottom-24 flex flex-col gap-6 z-20">
        {/* Like Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleLikeReel(reel.id);
          }}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
        >
          <Heart className={`w-7 h-7 drop-shadow-lg ${likedReels.has(reel.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} strokeWidth={2} />
          <span 
            className="text-white text-xs font-semibold drop-shadow-lg cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedReelForLikes(reel.id);
              setShowLikes(true);
            }}
          >
            {reel.like_count || 0}
          </span>
        </button>

        {/* Comment Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setSelectedReelForComments(reel.id);
            setShowComments(true);
          }}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
        >
          <MessageCircle className="w-7 h-7 text-white drop-shadow-lg" strokeWidth={2} />
          <span className="text-white text-xs font-semibold drop-shadow-lg">{reel.comment_count || 0}</span>
        </button>

        {/* Share Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setSelectedReelId(reel.id);
            setSelectedReelCaption(reel.caption || '');
            setSelectedReelVideo(reel.video_url);
            setShowShare(true);
          }}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
        >
          <Send className="w-7 h-7 text-white drop-shadow-lg" strokeWidth={2} />
        </button>

        {/* Bookmark Button */}
        <button 
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
        >
          <Bookmark className="w-7 h-7 text-white drop-shadow-lg" strokeWidth={2} />
        </button>

        {/* Three Dots Menu - Only for own reels */}
        {user && reel.user_id === user.id && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                onClick={(e) => e.stopPropagation()}
                className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
              >
                <MoreVertical className="w-7 h-7 text-white drop-shadow-lg" strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-md">
              <DropdownMenuItem onClick={() => navigate(`/edit-reel/${reel.id}`)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDeleteReel(reel.id)}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* User Info + Caption - Bottom Left */}
      <div className="absolute bottom-4 left-4 right-20 z-10 space-y-2">
        <div className="flex items-center gap-3">
          <OptimizedAvatar
            src={reel.profiles?.avatar_url}
            alt={reel.profiles?.username || 'User'}
            fallback={reel.profiles?.username?.[0] || '?'}
            userId={reel.user_id}
            className="w-10 h-10 border-2 border-white"
          />
          <span className="text-white font-normal text-xs drop-shadow-lg">@{reel.profiles?.username}</span>
        </div>
        <p className="text-white text-sm leading-relaxed drop-shadow-lg">
          {renderCaption(reel.caption || '')}
        </p>
        <div className="flex items-center gap-2">
          <Music className="w-3 h-3 text-white" />
          <span className="text-white text-xs drop-shadow-lg">
            {reel.music_tracks?.title || (reel.music_url ? 'Added Music' : 'Original Audio')}
          </span>
        </div>
      </div>
    </div>
  );
};
