import { memo, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Send, Bookmark, MoreVertical, Trash2, Edit, Volume2, VolumeX, Eye, Sparkles, Repeat2 } from "lucide-react";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { LazyImage } from "@/components/LazyImage";
import { LazyVideo } from "@/components/LazyVideo";
import { useViewTracking } from "@/hooks/useViewTracking";
import { EngagementInsightsDialog, EnhancedLikesDialog, EnhancedCommentsDialog } from "@/components/engagement";
import { RepostsDialog } from "@/components/engagement/RepostsDialog";
import { SavesDialog } from "@/components/engagement/SavesDialog";
import UserStatusIndicator from "@/components/UserStatusIndicator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
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
  const [showInsights, setShowInsights] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showReposts, setShowReposts] = useState(false);
  const [showSaves, setShowSaves] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [doubleTapLike, setDoubleTapLike] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  // Track views based on content type
  useViewTracking(item.type === 'reel' ? 'reel' : 'post', item.id, currentUserId, true);

  // Fetch initial repost/save state
  useEffect(() => {
    if (!currentUserId) return;
    
    const checkStatus = async () => {
      if (item.type === 'post') {
        const [repostRes, saveRes] = await Promise.all([
          supabase.from('post_reposts').select('id').eq('post_id', item.id).eq('user_id', currentUserId).maybeSingle(),
          supabase.from('post_saves').select('id').eq('post_id', item.id).eq('user_id', currentUserId).maybeSingle()
        ]);
        setIsReposted(!!repostRes.data);
        setIsSaved(!!saveRes.data);
      } else {
        const [repostRes, saveRes] = await Promise.all([
          supabase.from('reel_reposts').select('id').eq('reel_id', item.id).eq('user_id', currentUserId).maybeSingle(),
          supabase.from('reel_saves').select('id').eq('reel_id', item.id).eq('user_id', currentUserId).maybeSingle()
        ]);
        setIsReposted(!!repostRes.data);
        setIsSaved(!!saveRes.data);
      }
    };
    
    checkStatus();
  }, [currentUserId, item.id, item.type]);

  // Handle double tap to like (Instagram style)
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap < 300) {
      if (!isLiked) {
        onLike();
        setDoubleTapLike(true);
        setTimeout(() => setDoubleTapLike(false), 1000);
      }
    }
    setLastTap(now);
  }, [lastTap, isLiked, onLike]);

  // Handle repost
  const handleRepost = useCallback(async () => {
    if (!currentUserId) {
      toast.error("Please login to repost");
      return;
    }
    
    try {
      if (item.type === 'post') {
        if (isReposted) {
          await supabase.from('post_reposts').delete().eq('post_id', item.id).eq('user_id', currentUserId);
          setIsReposted(false);
          toast.success("Repost removed");
        } else {
          await supabase.from('post_reposts').insert({ post_id: item.id, user_id: currentUserId });
          setIsReposted(true);
          toast.success("Reposted to your profile");
        }
      } else {
        if (isReposted) {
          await supabase.from('reel_reposts').delete().eq('reel_id', item.id).eq('user_id', currentUserId);
          setIsReposted(false);
          toast.success("Repost removed");
        } else {
          await supabase.from('reel_reposts').insert({ reel_id: item.id, user_id: currentUserId });
          setIsReposted(true);
          toast.success("Reposted to your profile");
        }
      }
    } catch (error: any) {
      if (error?.code === '23505') {
        toast.info("Already reposted");
      } else {
        console.error("Repost error:", error);
        toast.error("Failed to repost");
      }
    }
  }, [currentUserId, item.id, item.type, isReposted]);

  // Handle save/bookmark
  const handleSave = useCallback(async () => {
    if (!currentUserId) {
      toast.error("Please login to save");
      return;
    }
    
    try {
      if (item.type === 'post') {
        if (isSaved) {
          await supabase.from('post_saves').delete().eq('post_id', item.id).eq('user_id', currentUserId);
          setIsSaved(false);
          toast.success("Removed from saved");
        } else {
          await supabase.from('post_saves').insert({ post_id: item.id, user_id: currentUserId });
          setIsSaved(true);
          toast.success("Saved to collection");
        }
      } else {
        if (isSaved) {
          await supabase.from('reel_saves').delete().eq('reel_id', item.id).eq('user_id', currentUserId);
          setIsSaved(false);
          toast.success("Removed from saved");
        } else {
          await supabase.from('reel_saves').insert({ reel_id: item.id, user_id: currentUserId });
          setIsSaved(true);
          toast.success("Saved to collection");
        }
      }
    } catch (error: any) {
      if (error?.code === '23505') {
        toast.info("Already saved");
      } else {
        console.error("Save error:", error);
        toast.error("Failed to save");
      }
    }
  }, [currentUserId, item.id, item.type, isSaved]);

  return (
    <div className="relative w-full bg-background">
      {/* Header - User Info */}
      <div className="flex items-center justify-between px-3 py-2">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate(`/user/${item.user_id}`)}
        >
          <div className="relative">
            <UserStatusIndicator userId={item.user_id} size="sm" />
            <OptimizedAvatar
              src={item.profiles?.avatar_url}
              alt={item.profiles?.username || 'User'}
              fallback={item.profiles?.username?.[0] || '?'}
              userId={item.user_id}
              className={`w-9 h-9 ring-2 ring-border bg-gradient-to-br ${item.profiles ? getBadgeColor(item.profiles.badge_level) : 'from-muted to-muted'}`}
            />
          </div>
          
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-tight">
              {item.profiles?.username || 'Unknown'}
            </span>
            {item.profiles?.professional_title && (
              <span className="text-xs text-muted-foreground">
                {item.profiles.professional_title.replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>

        {currentUserId && item.user_id === currentUserId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 hover:bg-muted rounded-full transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {item.type === 'post' && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Media - Instagram 4:5 Frameless */}
      {item.media_urls && item.media_urls.length > 0 && (
        <div 
          className="relative w-full bg-black"
          onClick={handleDoubleTap}
        >
          {item.media_urls.map((url: string, idx: number) => (
            <div 
              key={idx} 
              className="relative w-full aspect-[4/5]"
            >
              {url.includes('.mp3') || url.includes('.wav') || url.includes('.ogg') || url.includes('audio') ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 p-6">
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
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all z-10"
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
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {/* Double tap heart animation */}
              {doubleTapLike && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <Heart 
                    className="w-24 h-24 text-white fill-white animate-ping"
                    style={{ animationDuration: '0.5s' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons - Instagram Style */}
      <div className="px-3 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Like */}
            <button
              onClick={onLike}
              className="active:scale-75 transition-transform duration-100"
            >
              <Heart 
                className={`w-7 h-7 ${isLiked ? 'fill-red-500 text-red-500' : 'text-foreground'}`} 
                strokeWidth={1.5} 
              />
            </button>

            {/* Comment */}
            <button
              onClick={() => setShowComments(true)}
              className="active:scale-75 transition-transform duration-100"
            >
              <MessageCircle className="w-7 h-7 text-foreground" strokeWidth={1.5} />
            </button>

            {/* Share */}
            <button
              onClick={onShare}
              className="active:scale-75 transition-transform duration-100"
            >
              <Send className="w-7 h-7 text-foreground -rotate-12" strokeWidth={1.5} />
            </button>

            {/* Repost */}
            <button
              onClick={handleRepost}
              className="active:scale-75 transition-transform duration-100"
            >
              <Repeat2 
                className={`w-7 h-7 ${isReposted ? 'text-green-500' : 'text-foreground'}`} 
                strokeWidth={1.5} 
              />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* AI Insights */}
            <button
              onClick={() => setShowInsights(true)}
              className="active:scale-75 transition-transform duration-100"
            >
              <Sparkles className="w-6 h-6 text-pink-400" />
            </button>

            {/* Save/Bookmark */}
            <button
              onClick={handleSave}
              className="active:scale-75 transition-transform duration-100"
            >
              <Bookmark 
                className={`w-7 h-7 ${isSaved ? 'fill-foreground text-foreground' : 'text-foreground'}`} 
                strokeWidth={1.5} 
              />
            </button>
          </div>
        </div>

        {/* Engagement Stats */}
        <div className="flex items-center gap-3 mt-2 text-sm">
          <button 
            onClick={() => setShowLikes(true)}
            className="font-semibold text-foreground hover:opacity-70 transition-opacity"
          >
            {(item.like_count || 0).toLocaleString()} likes
          </button>
          
          {(item.repost_count || 0) > 0 && (
            <button 
              onClick={() => setShowReposts(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.repost_count} reposts
            </button>
          )}
          
          {(item.save_count || 0) > 0 && (
            <button 
              onClick={() => setShowSaves(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.save_count} saves
            </button>
          )}
        </div>

        {/* Caption */}
        {'content' in item && item.content && (
          <p className="text-sm mt-1">
            <span 
              className="font-semibold mr-1.5 cursor-pointer hover:opacity-70"
              onClick={() => navigate(`/user/${item.user_id}`)}
            >
              {item.profiles?.username}
            </span>
            {item.content}
          </p>
        )}

        {/* Comments Preview */}
        {(item.comment_count || 0) > 0 && (
          <button 
            onClick={() => setShowComments(true)}
            className="text-sm text-muted-foreground mt-1 hover:text-foreground transition-colors"
          >
            View all {item.comment_count} comments
          </button>
        )}

        {/* Views */}
        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground pb-3">
          <Eye className="w-3.5 h-3.5" />
          <span>{(item.view_count || 0).toLocaleString()} views</span>
        </div>
      </div>

      {/* Dialogs */}
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

      <RepostsDialog
        open={showReposts}
        onOpenChange={setShowReposts}
        contentType={item.type}
        contentId={item.id}
      />

      <SavesDialog
        open={showSaves}
        onOpenChange={setShowSaves}
        contentType={item.type}
        contentId={item.id}
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
          shares: item.repost_count || 0,
          views: item.view_count || 0,
        }}
        createdAt={item.created_at}
      />
    </div>
  );
});

FeedItem.displayName = 'FeedItem';
