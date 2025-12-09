import { memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Send, MoreVertical, Trash2, Edit, Volume2, VolumeX, Eye, Brain, Sparkles } from "lucide-react";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { getProfessionalBadge } from "@/lib/profileUtils";
import { LazyImage } from "@/components/LazyImage";
import { LazyVideo } from "@/components/LazyVideo";
import { useViewTracking } from "@/hooks/useViewTracking";
import { EngagementInsightsDialog, EnhancedLikesDialog, EnhancedCommentsDialog } from "@/components/engagement";
import UserStatusIndicator from "@/components/UserStatusIndicator";
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
  const [showInsights, setShowInsights] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Track post views
  useViewTracking('post', item.id, currentUserId, true);

  return (
    <div className="relative w-full">
      {/* Top Header Section */}
      <div className="relative px-3 py-4 bg-transparent backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3">
            <div 
              className="relative cursor-pointer pt-6"
              onClick={() => navigate(`/user/${item.user_id}`)}
            >
              {/* User Status on Avatar */}
              <UserStatusIndicator userId={item.user_id} size="sm" />
              
              <OptimizedAvatar
                src={item.profiles?.avatar_url}
                alt={item.profiles?.username || 'User'}
                fallback={item.profiles?.username?.[0] || '?'}
                userId={item.user_id}
                className={`relative w-12 h-12 ring-2 ring-primary/20 group-hover/avatar:ring-primary/50 transition-all duration-300 group-hover/avatar:scale-105 bg-gradient-to-br ${item.profiles ? getBadgeColor(item.profiles.badge_level) : 'from-gray-400 to-gray-200'}`}
              />
            </div>
            
            <div 
              className="flex-1 cursor-pointer"
              onClick={() => navigate(`/user/${item.user_id}`)}
            >
              <div className="flex items-center gap-2">
                <p className="font-normal text-base bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  {item.profiles?.full_name || item.profiles?.username || 'Unknown User'}
                </p>
                {item.profiles?.badge_level && (
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${getBadgeColor(item.profiles.badge_level)} flex items-center justify-center text-[10px] font-black text-white shadow-lg ring-2 ring-white/40 transition-all duration-300`}>
                    {item.profiles.badge_level[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                  {item.profiles?.professional_title?.replace(/_/g, " ") || ''}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Brain className="w-3 h-3 text-purple-400" />
                  <span>AI</span>
                </div>
              </div>
            </div>
        
        {currentUserId && item.user_id === currentUserId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-xl bg-transparent backdrop-blur-xl border border-white/20 hover:border-white/30 hover:bg-white/5 transition-all">
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-transparent backdrop-blur-xl border border-white/30">
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
      </div>

      {/* Content Caption */}
      {'content' in item && item.content && (
        <p className="text-sm px-3 py-2 text-foreground">{item.content}</p>
      )}

      {/* Media - Instagram Square Aspect Ratio */}
      {item.media_urls && item.media_urls.length > 0 && (
        <div className="w-full">
          {item.media_urls.map((url: string, idx: number) => (
            <div key={idx} className="relative w-full aspect-square bg-black">
              {url.includes('.mp3') || url.includes('.wav') || url.includes('.ogg') || url.includes('audio') ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black p-4">
                  <audio src={url} controls className="w-full" />
                </div>
              ) : item.type === 'reel' || url.includes('.mp4') || url.includes('video') ? (
                <div 
                  className="relative w-full h-full cursor-pointer"
                  onClick={item.type === 'reel' ? onFullscreen : undefined}
                >
                  <LazyVideo
                    src={url}
                    muted={!mutedVideos.has(item.id + url)}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMute(item.id + url);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-all z-10"
                  >
                    {mutedVideos.has(item.id + url) ? (
                      <Volume2 className="w-5 h-5 text-white" />
                    ) : (
                      <VolumeX className="w-5 h-5 text-white" />
                    )}
                  </button>
                </div>
              ) : (
                <LazyImage
                  src={url}
                  alt="Post media"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bottom Action Bar - Instagram Style */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-4">
          {/* Like Button */}
          <button
            onClick={onLike}
            className="active:scale-90 transition-transform"
          >
            <Heart className={`w-7 h-7 ${isLiked ? 'fill-red-500 text-red-500' : 'text-foreground'}`} strokeWidth={1.5} />
          </button>

          {/* Comment Button */}
          <button
            onClick={() => setShowComments(true)}
            className="active:scale-90 transition-transform"
          >
            <MessageCircle className="w-7 h-7 text-foreground" strokeWidth={1.5} />
          </button>

          {/* Share Button */}
          <button
            onClick={onShare}
            className="active:scale-90 transition-transform"
          >
            <Send className="w-7 h-7 text-foreground" strokeWidth={1.5} />
          </button>

          <div className="flex-1" />

          {/* AI Insights Button */}
          <button
            onClick={() => setShowInsights(true)}
            className="active:scale-90 transition-transform"
          >
            <Sparkles className="w-6 h-6 text-pink-400" />
          </button>
        </div>

        {/* Likes Count */}
        <button 
          onClick={() => setShowLikes(true)}
          className="mt-2 text-sm font-semibold text-foreground"
        >
          {item.like_count || 0} likes
        </button>

        {/* Views */}
        <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
          <Eye className="w-4 h-4" />
          <span>{item.view_count || 0} views</span>
        </div>
      </div>

      {/* Enhanced Dialogs with AI */}
      <EnhancedLikesDialog
        open={showLikes}
        onOpenChange={setShowLikes}
        contentType={item.type}
        contentId={item.id}
      />

      <EnhancedCommentsDialog
        open={showComments}
        onOpenChange={setShowComments}
        contentType={item.type}
        contentId={item.id}
        onCommentChange={onComment}
      />

      <EngagementInsightsDialog
        open={showInsights}
        onOpenChange={setShowInsights}
        contentId={item.id}
        contentType={item.type}
        content={item.content || item.caption || ''}
        engagement={{
          likes: item.like_count || 0,
          comments: item.comment_count || 0,
          shares: 0,
          views: item.view_count || 0,
        }}
        createdAt={item.created_at}
      />
    </div>
  );
});

FeedItem.displayName = 'FeedItem';
