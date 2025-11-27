import { memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Send, MoreVertical, Trash2, Edit, Volume2, VolumeX, Eye, Brain, Sparkles } from "lucide-react";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { getProfessionalBadge } from "@/lib/profileUtils";
import { LazyImage } from "@/components/LazyImage";
import { LazyVideo } from "@/components/LazyVideo";
import { useViewTracking } from "@/hooks/useViewTracking";
import { EngagementInsightsDialog, EnhancedLikesDialog, EnhancedCommentsDialog } from "@/components/engagement";
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
    <div className="relative bg-black w-full">
      {/* Top Header Section */}
      <div className="relative px-3 py-4 bg-transparent backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3">
            <div 
              className="relative cursor-pointer"
              onClick={() => navigate(`/user/${item.user_id}`)}
            >
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
                <p className="font-bold text-lg bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
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

      {/* Content - Full Width */}
      <div className="relative w-full">
        {'content' in item && item.content && (
          <p className="text-sm px-3 py-3 text-white bg-black/50">{item.content}</p>
        )}

        {/* Media - Full Screen */}
        {item.media_urls && item.media_urls.length > 0 && (
          <div className="w-full">
            {item.media_urls.map((url: string, idx: number) => (
              <div key={idx} className="relative w-full">
                {url.includes('.mp3') || url.includes('.wav') || url.includes('.ogg') || url.includes('audio') ? (
                  <div className="bg-black p-4">
                    <audio src={url} controls className="w-full" />
                  </div>
                ) : item.type === 'reel' || url.includes('.mp4') || url.includes('video') ? (
                  <div 
                    className="relative w-full cursor-pointer"
                    onClick={item.type === 'reel' ? onFullscreen : undefined}
                  >
                    <LazyVideo
                      src={url}
                      muted={!mutedVideos.has(item.id + url)}
                      className="w-full h-auto object-cover"
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
      </div>

      {/* Bottom Action Bar - Glassy Transparent with Contours */}
      <div className="relative px-2 sm:px-3 py-2 sm:py-3 bg-transparent backdrop-blur-xl border-t border-white/10">
        <div className="flex items-center justify-between gap-1 sm:gap-2">
            {/* Like Button */}
            <button
                onClick={onLike}
                className={`relative flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-full transition-all duration-300 backdrop-blur-xl ${
                  isLiked 
                    ? 'bg-transparent border border-red-500/50 text-red-500 hover:scale-110 hover:border-red-500/70' 
                    : 'bg-transparent hover:bg-white/5 border border-white/20 hover:border-white/30 text-muted-foreground hover:text-primary hover:scale-105'
                }`}
              >
                <Heart className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 ${isLiked ? 'fill-current scale-110' : ''}`} />
                <span 
                  className="text-xs sm:text-sm font-bold min-w-[16px] cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLikes(true);
                  }}
                >
                  {item.like_count || 0}
                </span>
              </button>

            {/* Comment Button */}
            <button
                onClick={() => setShowComments(true)}
                className="relative flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-full bg-transparent backdrop-blur-xl hover:bg-white/5 border border-white/20 hover:border-white/30 text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-105"
              >
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm font-bold min-w-[16px]">{item.comment_count || 0}</span>
              </button>

            {/* Share Button */}
            <button
                onClick={onShare}
                className="relative flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-full bg-transparent backdrop-blur-xl hover:bg-white/5 border border-white/20 hover:border-green-500/30 text-muted-foreground hover:text-green-500 transition-all duration-300 hover:scale-105"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            
            {/* AI Insights Button */}
            <button
                onClick={() => setShowInsights(true)}
                className="relative flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-full bg-transparent backdrop-blur-xl hover:bg-white/5 border border-purple-500/40 hover:border-purple-500/60 transition-all duration-300 hover:scale-105"
              >
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-pink-400 animate-pulse transition-colors" />
                <span className="text-[10px] sm:text-xs font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent whitespace-nowrap">
                  AI
                </span>
              </button>
            
            {/* Views Counter */}
            <div className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-full bg-transparent backdrop-blur-xl border border-white/20">
              <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm font-bold text-muted-foreground">{item.view_count || 0}</span>
            </div>
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
