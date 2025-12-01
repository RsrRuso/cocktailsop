import { FC, useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Send, MoreVertical, Music, Trash2, Edit, Volume2, VolumeX, Bookmark } from 'lucide-react';
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

  // Track view when this reel is visible
  useViewTracking('reel', reel.id, user?.id, index === currentIndex);

  // Preload adjacent videos aggressively
  useEffect(() => {
    if (videoRef.current && Math.abs(index - currentIndex) <= 2) {
      // Preload videos within 2 positions
      videoRef.current.load();
    }
  }, [index, currentIndex]);

  // Play/pause based on visibility
  useEffect(() => {
    if (videoRef.current) {
      if (index === currentIndex) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [index, currentIndex]);

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
    <div className="h-screen snap-start relative">
      {/* Full Screen Video */}
      <video
        ref={videoRef}
        src={reel.video_url}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        playsInline
        muted={mutedVideos.has(reel.id)}
        preload={Math.abs(index - currentIndex) <= 2 ? "auto" : "metadata"}
      />

      {/* Mute/Unmute Button - Top Right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMutedVideos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(reel.id)) {
              newSet.delete(reel.id);
            } else {
              newSet.add(reel.id);
            }
            return newSet;
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

      {/* Right Side Action Buttons */}
      <div className="absolute right-2 bottom-20 flex flex-col gap-5 z-20">
        {/* Like Button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleLikeReel(reel.id);
          }}
          className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
        >
          <Heart className={`w-6 h-6 drop-shadow-lg ${likedReels.has(reel.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} strokeWidth={1.5} />
          <span 
            className="text-white text-xs font-light drop-shadow-lg cursor-pointer"
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
          className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
        >
          <MessageCircle className="w-6 h-6 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white text-xs font-light drop-shadow-lg">{reel.comment_count || 0}</span>
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
          className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
        >
          <Send className="w-6 h-6 text-white drop-shadow-lg" strokeWidth={1.5} />
        </button>

        {/* Bookmark Button */}
        <button 
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
        >
          <Bookmark className="w-6 h-6 text-white drop-shadow-lg" strokeWidth={1.5} />
        </button>

        {/* Three Dots Menu - Only for own reels */}
        {user && reel.user_id === user.id && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                onClick={(e) => e.stopPropagation()}
                className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
              >
                <MoreVertical className="w-7 h-7 text-white drop-shadow-lg" />
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
          <span className="text-white font-bold text-sm drop-shadow-lg">@{reel.profiles?.username}</span>
        </div>
        <p className="text-white text-sm leading-relaxed drop-shadow-lg">
          {renderCaption(reel.caption || '')}
        </p>
        <div className="flex items-center gap-2">
          <Music className="w-3 h-3 text-white" />
          <span className="text-white text-xs drop-shadow-lg">Original Audio</span>
        </div>
      </div>
    </div>
  );
};
