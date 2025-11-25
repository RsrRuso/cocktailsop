import { FC, useState } from 'react';
import { Heart, MessageCircle, Send, MoreVertical, Music, Trash2, Edit, Volume2, VolumeX, Eye, Brain, Sparkles } from 'lucide-react';
import OptimizedAvatar from '@/components/OptimizedAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useViewTracking } from '@/hooks/useViewTracking';
import { EngagementInsightsDialog } from '@/components/engagement';

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
  const [showInsights, setShowInsights] = useState(false);
  
  // Track view when this reel is visible
  useViewTracking('reel', reel.id, user?.id, index === currentIndex);

  return (
    <div className="h-screen snap-start relative flex items-center justify-center bg-black">
      {/* Video Player - Only autoplay visible reel */}
      <video
        src={reel.video_url}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        playsInline
        muted={mutedVideos.has(reel.id)}
        autoPlay={index === currentIndex}
        preload={Math.abs(index - currentIndex) <= 1 ? "auto" : "none"}
      />

      {/* Mute/Unmute Button - Glassy with Contours */}
      <button
        onClick={() => {
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
        className="absolute top-20 right-3 sm:right-4 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-transparent backdrop-blur-xl border-2 border-white/40 flex items-center justify-center hover:border-white/60 hover:bg-white/5 transition-all"
      >
        {mutedVideos.has(reel.id) ? (
          <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        )}
      </button>

      {/* Bottom Action Bar - Glassy Transparent with Contours */}
      <div className="absolute bottom-0 left-0 right-0 h-12 sm:h-14 bg-transparent backdrop-blur-xl border-t-2 border-white/30">
        <div className="h-full flex items-center justify-around px-1 sm:px-2">
          <button 
            onClick={() => handleLikeReel(reel.id)}
            className="flex flex-col items-center gap-0.5 hover:scale-110 transition-transform active:scale-95"
          >
            <Heart className={`w-5 h-5 sm:w-6 sm:h-6 transition-all ${likedReels.has(reel.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            <span 
              className="text-white text-[9px] sm:text-[10px] font-semibold cursor-pointer hover:underline drop-shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedReelForLikes(reel.id);
                setShowLikes(true);
              }}
            >
              {reel.like_count || 0}
            </span>
          </button>

          <button 
            onClick={() => {
              setSelectedReelForComments(reel.id);
              setShowComments(true);
            }}
            className="flex flex-col items-center gap-0.5 hover:scale-110 transition-transform active:scale-95"
          >
            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            <span className="text-white text-[9px] sm:text-[10px] font-semibold drop-shadow-lg">{reel.comment_count || 0}</span>
          </button>

          <button 
            onClick={() => {
              setSelectedReelId(reel.id);
              setSelectedReelCaption(reel.caption || '');
              setSelectedReelVideo(reel.video_url);
              setShowShare(true);
            }}
            className="flex flex-col items-center gap-0.5 hover:scale-110 transition-transform active:scale-95 group"
          >
            <Send className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            <span className="text-white text-[9px] sm:text-[10px] font-semibold drop-shadow-lg hidden sm:inline">Send</span>
          </button>

          <button className="flex flex-col items-center gap-0.5">
            <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            <span className="text-white text-[9px] sm:text-[10px] font-semibold drop-shadow-lg">{reel.view_count || 0}</span>
          </button>

          {user && reel.user_id === user.id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex flex-col items-center gap-0.5 hover:scale-110 transition-transform active:scale-95">
                  <MoreVertical className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-xl border-2 border-white/30">
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
      </div>

      {/* User Info - Left Bottom */}
      <div className="absolute bottom-20 left-4 right-20 z-10 space-y-3">
        <div className="flex items-center gap-2">
          <OptimizedAvatar
            src={reel.profiles?.avatar_url}
            alt={reel.profiles?.username || 'User'}
            fallback={reel.profiles?.username?.[0] || '?'}
            userId={reel.user_id}
            className="w-10 h-10 border-2 border-white avatar-3d"
          />
          <p className="text-white font-bold text-lg text-3d-neon">@{reel.profiles?.username}</p>
        </div>
        <p className="text-white text-base line-clamp-3 caption-3d-neon">{reel.caption}</p>
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-white drop-shadow-[0_0_10px_rgba(195,221,253,0.8)]" />
          <p className="text-white text-sm font-semibold text-3d-neon">Original Audio</p>
        </div>
      </div>

      {/* AI Insights Button - Mobile Friendly Positioning */}
      <div className="absolute bottom-[56px] sm:bottom-[64px] right-1 sm:right-2 z-20">
        <button
            onClick={() => setShowInsights(true)}
            className="relative flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-full bg-transparent border border-purple-400/50 hover:border-purple-400/70 backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-pink-300 animate-pulse transition-colors" />
            <span className="text-[8px] sm:text-[9px] font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-transparent whitespace-nowrap">
              AI
            </span>
          </button>
      </div>

      {/* AI Insights Dialog */}
      <EngagementInsightsDialog
        open={showInsights}
        onOpenChange={setShowInsights}
        contentId={reel.id}
        contentType="reel"
        content={reel.caption || ''}
        engagement={{
          likes: reel.like_count || 0,
          comments: reel.comment_count || 0,
          shares: 0,
          views: reel.view_count || 0,
        }}
        createdAt={reel.created_at}
      />
    </div>
  );
};
