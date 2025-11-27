import { FC, useState } from 'react';
import { Heart, MessageCircle, Send, MoreVertical, Music, Trash2, Edit, Volume2, VolumeX, Eye, Sparkles, Share2, Bookmark } from 'lucide-react';
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Track view when this reel is visible
  useViewTracking('reel', reel.id, user?.id, index === currentIndex);

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
    <div 
      className="h-screen snap-start relative flex items-center justify-center bg-black"
      onClick={() => !isFullscreen && setIsFullscreen(true)}
    >
      {/* Video Player - Full screen, 9:16 aspect ratio like Instagram */}
      <video
        src={reel.video_url}
        className="w-full h-full object-cover"
        style={{ aspectRatio: '9/16' }}
        loop
        playsInline
        muted={mutedVideos.has(reel.id)}
        autoPlay={index === currentIndex}
        preload={Math.abs(index - currentIndex) <= 1 ? "auto" : "none"}
      />

      {/* Mute/Unmute Button */}
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
        className="absolute top-20 right-4 z-30 w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-black/50 transition-all"
      >
        {mutedVideos.has(reel.id) ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </button>

      {!isFullscreen ? (
        // FEED VIEW - Horizontal buttons at bottom
        <>
          <div className="absolute bottom-0 left-0 right-0 pb-safe">
            {/* Bottom Action Bar */}
            <div className="h-16 bg-gradient-to-t from-black/80 via-black/40 to-transparent backdrop-blur-sm">
              <div className="h-full flex items-center justify-around px-4">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLikeReel(reel.id);
                  }}
                  className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95"
                >
                  <Heart className={`w-7 h-7 transition-all ${likedReels.has(reel.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                  <span className="text-white text-xs font-bold drop-shadow-lg">{reel.like_count || 0}</span>
                </button>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedReelForComments(reel.id);
                    setShowComments(true);
                  }}
                  className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95"
                >
                  <MessageCircle className="w-7 h-7 text-white" />
                  <span className="text-white text-xs font-bold drop-shadow-lg">{reel.comment_count || 0}</span>
                </button>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedReelId(reel.id);
                    setSelectedReelCaption(reel.caption || '');
                    setSelectedReelVideo(reel.video_url);
                    setShowShare(true);
                  }}
                  className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95"
                >
                  <Share2 className="w-7 h-7 text-white" />
                </button>

                <button 
                  onClick={(e) => e.stopPropagation()}
                  className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95"
                >
                  <Bookmark className="w-7 h-7 text-white" />
                </button>

                {user && reel.user_id === user.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95"
                      >
                        <MoreVertical className="w-7 h-7 text-white" />
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
            </div>
          </div>

          {/* User Info + Caption - Bottom Left */}
          <div className="absolute bottom-20 left-4 right-24 z-10 space-y-2">
            <div className="flex items-center gap-3">
              <OptimizedAvatar
                src={reel.profiles?.avatar_url}
                alt={reel.profiles?.username || 'User'}
                fallback={reel.profiles?.username?.[0] || '?'}
                userId={reel.user_id}
                className="w-11 h-11 border-2 border-white"
              />
              <span className="text-white font-bold text-base drop-shadow-lg">@{reel.profiles?.username}</span>
            </div>
            <p className="text-white text-sm leading-relaxed drop-shadow-lg line-clamp-2">
              {renderCaption(reel.caption || '')}
            </p>
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-white" />
              <span className="text-white text-xs drop-shadow-lg">Original Audio</span>
            </div>
          </div>
        </>
      ) : (
        // FULLSCREEN VIEW - Vertical buttons on right like Instagram
        <>
          {/* Right Side Vertical Action Buttons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-20">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleLikeReel(reel.id);
              }}
              className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95"
            >
              <div className="w-12 h-12 rounded-full bg-transparent backdrop-blur-md border-2 border-white/30 flex items-center justify-center hover:border-white/50 hover:bg-white/10">
                <Heart className={`w-7 h-7 transition-all ${likedReels.has(reel.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
              </div>
              <span 
                className="text-white text-xs font-bold drop-shadow-lg cursor-pointer"
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
              onClick={(e) => {
                e.stopPropagation();
                setSelectedReelForComments(reel.id);
                setShowComments(true);
              }}
              className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95"
            >
              <div className="w-12 h-12 rounded-full bg-transparent backdrop-blur-md border-2 border-white/30 flex items-center justify-center hover:border-white/50 hover:bg-white/10">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <span className="text-white text-xs font-bold drop-shadow-lg">{reel.comment_count || 0}</span>
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedReelId(reel.id);
                setSelectedReelCaption(reel.caption || '');
                setSelectedReelVideo(reel.video_url);
                setShowShare(true);
              }}
              className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95"
            >
              <div className="w-12 h-12 rounded-full bg-transparent backdrop-blur-md border-2 border-white/30 flex items-center justify-center hover:border-white/50 hover:bg-white/10">
                <Share2 className="w-7 h-7 text-white" />
              </div>
            </button>

            <button 
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95"
            >
              <div className="w-12 h-12 rounded-full bg-transparent backdrop-blur-md border-2 border-white/30 flex items-center justify-center hover:border-white/50 hover:bg-white/10">
                <Bookmark className="w-7 h-7 text-white" />
              </div>
            </button>

            <button 
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-12 h-12 rounded-full bg-transparent backdrop-blur-md border-2 border-white/30 flex items-center justify-center">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs font-bold drop-shadow-lg">{reel.view_count || 0}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowInsights(true);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/20 border border-purple-400/50 backdrop-blur-md hover:bg-purple-500/30 transition-all"
            >
              <Sparkles className="w-3 h-3 text-pink-300 animate-pulse" />
              <span className="text-[9px] font-bold text-white">AI</span>
            </button>

            {user && reel.user_id === user.id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    onClick={(e) => e.stopPropagation()}
                    className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95"
                  >
                    <div className="w-12 h-12 rounded-full bg-transparent backdrop-blur-md border-2 border-white/30 flex items-center justify-center hover:border-white/50 hover:bg-white/10">
                      <MoreVertical className="w-7 h-7 text-white" />
                    </div>
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

          {/* Animated Caption - Bottom (slides up when fullscreen) */}
          <div 
            className="absolute bottom-4 left-4 right-20 z-10 space-y-2 animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <OptimizedAvatar
                src={reel.profiles?.avatar_url}
                alt={reel.profiles?.username || 'User'}
                fallback={reel.profiles?.username?.[0] || '?'}
                userId={reel.user_id}
                className="w-11 h-11 border-2 border-white"
              />
              <span className="text-white font-bold text-base drop-shadow-lg">@{reel.profiles?.username}</span>
            </div>
            <p className="text-white text-sm leading-relaxed drop-shadow-lg max-h-20 overflow-y-auto">
              {renderCaption(reel.caption || '')}
            </p>
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-white" />
              <span className="text-white text-xs drop-shadow-lg">Original Audio</span>
            </div>
          </div>

          {/* Exit fullscreen indicator */}
          <div 
            onClick={() => setIsFullscreen(false)}
            className="absolute top-20 left-4 z-30 text-white/70 text-xs cursor-pointer hover:text-white"
          >
            Tap to exit fullscreen
          </div>
        </>
      )}

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
