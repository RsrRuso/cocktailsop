import { FC } from 'react';
import { Heart, MessageCircle, Send, MoreVertical, Music, Trash2, Edit, Volume2, VolumeX, Eye } from 'lucide-react';
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

      {/* Mute/Unmute Button */}
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
        className="absolute top-20 right-4 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all"
      >
        {mutedVideos.has(reel.id) ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Bottom Action Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent backdrop-blur-sm border-t border-white/10">
        <div className="h-full flex items-center justify-around px-4">
          <button 
            onClick={() => handleLikeReel(reel.id)}
            className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95"
          >
            <Heart className={`w-7 h-7 transition-all ${likedReels.has(reel.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            <span 
              className="text-white text-xs font-semibold cursor-pointer hover:underline"
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
            className="flex flex-col items-center gap-1 hover:scale-110 transition-transform"
          >
            <MessageCircle className="w-7 h-7 text-white" />
            <span className="text-white text-xs font-semibold">{reel.comment_count || 0}</span>
          </button>

          <button 
            onClick={() => {
              setSelectedReelId(reel.id);
              setSelectedReelCaption(reel.caption || '');
              setSelectedReelVideo(reel.video_url);
              setShowShare(true);
            }}
            className="flex flex-col items-center gap-1 hover:scale-110 transition-transform group"
          >
            <div className="relative">
              <Send className="w-7 h-7 text-white drop-shadow-[0_4px_8px_rgba(255,255,255,0.3)] group-hover:drop-shadow-[0_6px_12px_rgba(255,255,255,0.5)] transition-all" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} />
            </div>
            <span className="text-white text-xs font-semibold">Send</span>
          </button>

          <button className="flex flex-col items-center gap-1">
            <Eye className="w-7 h-7 text-white" />
            <span className="text-white text-xs font-semibold">{reel.view_count || 0}</span>
          </button>

          {user && reel.user_id === user.id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex flex-col items-center gap-1 hover:scale-110 transition-transform">
                  <MoreVertical className="w-7 h-7 text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass">
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
    </div>
  );
};
