import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Send, MoreVertical, Trash2, Edit, Volume2, VolumeX, Eye } from "lucide-react";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { getProfessionalBadge } from "@/lib/profileUtils";
import { LazyImage } from "@/components/LazyImage";
import { LazyVideo } from "@/components/LazyVideo";
import { useViewTracking } from "@/hooks/useViewTracking";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface FeedItemProps {
  item: any;
  currentUserId?: string;
  isLiked: boolean;
  mutedVideos: Set<string>;
  onLike: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onComment: () => void;
  onShare: () => void;
  onToggleMute: (videoId: string) => void;
  onFullscreen: () => void;
  onViewLikes: () => void;
  getBadgeColor: (level: string) => string;
}

export const FeedItem = memo(({
  item,
  currentUserId,
  isLiked,
  mutedVideos,
  onLike,
  onDelete,
  onEdit,
  onComment,
  onShare,
  onToggleMute,
  onFullscreen,
  onViewLikes,
  getBadgeColor
}: FeedItemProps) => {
  const navigate = useNavigate();
  const professionalBadge = getProfessionalBadge(item.profiles?.professional_title || null);
  const BadgeIcon = professionalBadge.icon;

  // Track post views
  useViewTracking('post', item.id, currentUserId, true);

  return (
    <div className="glass rounded-xl p-2 space-y-3 border border-border/50">
      {/* Header */}
      <div className="flex items-center gap-3 px-2 pt-2">
        <div 
          className="relative cursor-pointer"
          onClick={() => navigate(`/user/${item.user_id}`)}
        >
          <OptimizedAvatar
            src={item.profiles?.avatar_url}
            alt={item.profiles?.username || 'User'}
            fallback={item.profiles?.username?.[0] || '?'}
            userId={item.user_id}
            className={`w-10 h-10 avatar-glow ring-1 ring-offset-1 ring-offset-background bg-gradient-to-br ${item.profiles ? getBadgeColor(item.profiles.badge_level) : 'from-gray-400 to-gray-200'}`}
          />
        </div>
        <div 
          className="flex-1 cursor-pointer"
          onClick={() => navigate(`/user/${item.user_id}`)}
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center relative">
              <p className="font-semibold">{item.profiles?.full_name || item.profiles?.username || 'Unknown User'}</p>
              {item.profiles?.badge_level && (
                <div className="relative ml-1.5 group">
                  <div className={`absolute -inset-1 bg-gradient-to-br ${getBadgeColor(item.profiles.badge_level)} blur-md opacity-60 group-hover:opacity-100 transition-all duration-300 rounded-full animate-pulse`} />
                  <div className={`relative w-5 h-5 rounded-full bg-gradient-to-br ${getBadgeColor(item.profiles.badge_level)} flex items-center justify-center text-[9px] font-bold text-white shadow-xl ring-2 ring-white/30 group-hover:scale-110 transition-transform duration-200`}>
                    {item.profiles.badge_level[0].toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-blue-500 capitalize">
            {item.profiles?.professional_title?.replace(/_/g, " ") || ''}
          </p>
        </div>
        
        {currentUserId && item.user_id === currentUserId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="glass-hover p-2 rounded-xl">
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass">
              {item.type === 'post' && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Post
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content */}
      {'content' in item && item.content && (
        <p className="text-sm px-2">{item.content}</p>
      )}

      {/* Media */}
      {item.media_urls && item.media_urls.length > 0 && (
        <div className={`grid gap-1 ${item.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {item.media_urls.map((url: string, idx: number) => (
            <div key={idx} className="relative rounded-xl overflow-hidden">
              {url.includes('.mp3') || url.includes('.wav') || url.includes('.ogg') || url.includes('audio') ? (
                <div className="bg-primary/10 rounded-xl p-4">
                  <audio src={url} controls className="w-full" />
                </div>
              ) : item.type === 'reel' || url.includes('.mp4') || url.includes('video') ? (
                <div className="relative">
                  <LazyVideo
                    src={url}
                    muted={!mutedVideos.has(item.id + url)}
                    onClick={onFullscreen}
                    className="w-full h-auto max-h-96 object-cover cursor-pointer"
                  />
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMute(item.id + url);
                    }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all z-10"
                  >
                    {mutedVideos.has(item.id + url) ? (
                      <Volume2 className="w-4 h-4 text-white" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>
              ) : (
                <LazyImage
                  src={url}
                  alt="Post media"
                  className="w-full h-auto object-cover"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-6 px-2 pb-1">
        <button 
          onClick={onLike}
          className={`flex items-center gap-2 transition-all hover:scale-110 ${
            isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
          }`}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          <span 
            className="text-sm font-bold min-w-[20px] cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onViewLikes();
            }}
          >
            {item.like_count || 0}
          </span>
        </button>
        <button 
          onClick={onComment}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all hover:scale-110"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-bold min-w-[20px]">{item.comment_count || 0}</span>
        </button>
        <button 
          onClick={onShare}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all hover:scale-110"
        >
          <Send className="w-5 h-5" />
          <span className="text-xs">Send</span>
        </button>
        <div className="flex items-center gap-2 text-muted-foreground ml-auto">
          <Eye className="w-5 h-5" />
          <span className="text-sm font-bold">{item.view_count || 0}</span>
        </div>
      </div>
    </div>
  );
});

FeedItem.displayName = 'FeedItem';
