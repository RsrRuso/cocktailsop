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
    <div className="group relative">
      {/* Animated Glow Background */}
      <div className="absolute -inset-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-2xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 animate-gradient-xy"></div>
      
      {/* Glassy Transparent Frame with Contour Borders */}
      <div className="relative bg-transparent backdrop-blur-xl rounded-2xl border-2 border-white/20 group-hover:border-white/30 transition-all duration-300 overflow-hidden">
        {/* Subtle Glow on Edges */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 opacity-30 pointer-events-none"></div>
        
        <div className="relative p-4 space-y-4">
          {/* Enhanced Header */}
          <div className="flex items-center gap-3">
            <div 
              className="relative cursor-pointer group/avatar"
              onClick={() => navigate(`/user/${item.user_id}`)}
            >
              {/* Avatar Glow Effect */}
              <div className={`absolute -inset-1 bg-gradient-to-br ${item.profiles ? getBadgeColor(item.profiles.badge_level) : 'from-purple-500 to-pink-500'} rounded-full blur-md opacity-50 group-hover/avatar:opacity-100 transition-opacity animate-pulse`}></div>
              
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
                  <div className="relative group/badge">
                    <div className={`absolute -inset-2 bg-gradient-to-br ${getBadgeColor(item.profiles.badge_level)} blur-lg opacity-50 group-hover/badge:opacity-100 transition-all duration-300 rounded-full animate-pulse`} />
                    <div className={`relative w-6 h-6 rounded-full bg-gradient-to-br ${getBadgeColor(item.profiles.badge_level)} flex items-center justify-center text-[10px] font-black text-white shadow-2xl ring-2 ring-white/40 group-hover/badge:scale-110 group-hover/badge:rotate-12 transition-all duration-300`}>
                      {item.profiles.badge_level[0].toUpperCase()}
                    </div>
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
              <button className="p-2 rounded-xl bg-transparent backdrop-blur-xl border-2 border-white/20 hover:border-white/30 hover:bg-white/5 transition-all">
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-transparent backdrop-blur-xl border-2 border-white/30">
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
                    className="w-full h-auto min-h-[400px] max-h-[600px] object-cover rounded-xl"
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

          {/* Enhanced Actions Bar - Glassy Transparent with Contours */}
          <div className="flex items-center gap-3 pt-2 border-t-2 border-white/20">
            {/* Like Button with Glow */}
            <div className="relative group/like">
              <div className={`absolute -inset-1 rounded-full blur-md transition-all duration-300 ${
                isLiked 
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 opacity-50 group-hover/like:opacity-75' 
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover/like:opacity-30'
              }`}></div>
              
              <button 
                onClick={onLike}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 backdrop-blur-xl ${
                  isLiked 
                    ? 'bg-transparent border-2 border-red-500/50 text-red-500 hover:scale-110 hover:border-red-500/70' 
                    : 'bg-transparent hover:bg-white/5 border-2 border-white/20 hover:border-white/30 text-muted-foreground hover:text-primary hover:scale-105'
                }`}
              >
                <Heart className={`w-5 h-5 transition-all duration-300 ${isLiked ? 'fill-current scale-110' : ''}`} />
                <span 
                  className="text-sm font-bold min-w-[20px] cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLikes(true);
                  }}
                >
                  {item.like_count || 0}
                </span>
              </button>
            </div>

            {/* Comment Button with Glow */}
            <div className="relative group/comment">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-md opacity-0 group-hover/comment:opacity-30 transition-opacity duration-300"></div>
              
              <button 
                onClick={() => setShowComments(true)}
                className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-transparent backdrop-blur-xl hover:bg-white/5 border-2 border-white/20 hover:border-white/30 text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-105"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-bold min-w-[20px]">{item.comment_count || 0}</span>
              </button>
            </div>

            {/* Share Button with Glow */}
            <div className="relative group/share">
              <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-md opacity-0 group-hover/share:opacity-30 transition-opacity duration-300"></div>
              
              <button 
                onClick={onShare}
                className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-transparent backdrop-blur-xl hover:bg-white/5 border-2 border-white/20 hover:border-green-500/30 text-muted-foreground hover:text-green-500 transition-all duration-300 hover:scale-105"
              >
                <Send className="w-5 h-5" />
                <span className="text-xs font-medium">Share</span>
              </button>
            </div>
            
            {/* AI Insights Button - Enhanced */}
            <div className="relative ml-auto group/ai">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full blur-md opacity-40 group-hover/ai:opacity-70 transition-opacity duration-300 animate-pulse"></div>
              
              <button
                onClick={() => setShowInsights(true)}
                className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-transparent backdrop-blur-xl hover:bg-white/5 border-2 border-purple-500/40 hover:border-purple-500/60 transition-all duration-300 hover:scale-105"
              >
                <Brain className="w-4 h-4 text-purple-400 group-hover/ai:text-pink-400 transition-colors" />
                <Sparkles className="w-3.5 h-3.5 text-pink-400 group-hover/ai:text-blue-400 animate-pulse transition-colors" />
                <span className="text-xs font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                  AI Insights
                </span>
              </button>
            </div>
            
            {/* Views Counter with Glassy Transparent Border */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-transparent backdrop-blur-xl border-2 border-white/20">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-muted-foreground">{item.view_count || 0}</span>
            </div>
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
