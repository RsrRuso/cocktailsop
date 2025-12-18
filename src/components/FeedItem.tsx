import { memo, useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Send, Bookmark, MoreVertical, Trash2, Edit, Volume2, VolumeX, Eye, Sparkles, Repeat2, Music } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
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

interface FeedItemProps {
  item: any;
  currentUserId?: string;
  // Engagement state from parent hook
  isLiked: boolean;
  isSaved?: boolean;
  isReposted?: boolean;
  // Engagement actions from parent hook
  onLike: () => void;
  onSave?: () => void;
  onRepost?: () => void;
  // Other actions
  onDelete: () => void;
  onEdit: () => void;
  onComment: () => void;
  onShare: () => void;
  onFullscreen: () => void;
  // Video mute state
  mutedVideos: Set<string>;
  onToggleMute: (videoId: string) => void;
  // Utility
  getBadgeColor: (level: string) => string;
}

export const FeedItem = memo(({
  item,
  currentUserId,
  isLiked,
  isSaved,
  isReposted,
  onLike,
  onSave,
  onRepost,
  onDelete,
  onEdit,
  onComment,
  onShare,
  onFullscreen,
  mutedVideos,
  onToggleMute,
  getBadgeColor,
}: FeedItemProps) => {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showReposts, setShowReposts] = useState(false);
  const [showSaves, setShowSaves] = useState(false);
  const [doubleTapLike, setDoubleTapLike] = useState(false);
  const [lastTap, setLastTap] = useState(0);
  const [commentCount, setCommentCount] = useState(item.comment_count || 0);
  const [isVisible, setIsVisible] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  // Check if post/reel has attached music
  const hasAttachedMusic = Boolean(item.music_track_id || item.music_url);
  const musicUrl = item.music_tracks?.preview_url || item.music_url;
  const shouldMuteVideo = hasAttachedMusic && item.mute_original_audio === true;
  const isImageReel = item.type === 'reel' && item.is_image_reel === true;
  const videoKey = item.id + (item.video_url || item.media_urls?.[0] || '');
  const isUserMuted = mutedVideos.has(videoKey);
  
  // Handle visibility change from LazyVideo
  const handleVisibilityChange = useCallback((visible: boolean) => {
    setIsVisible(visible);
  }, []);

  // Track visibility for image/text posts
  useEffect(() => {
    const hasVideo = item.media_urls?.some((url: string) => 
      url.includes('.mp4') || url.includes('video')
    );
    if (hasVideo) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5);
        });
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [item.media_urls]);

  // Play/pause attached music based on visibility and mute state
  useEffect(() => {
    if (audioRef.current && hasAttachedMusic && musicUrl) {
      const shouldPlay = isVisible && !isUserMuted;
      if (shouldPlay) {
        audioRef.current.muted = false;
        audioRef.current.play().catch(() => {});
        setIsMusicPlaying(true);
      } else {
        audioRef.current.pause();
        audioRef.current.muted = true;
        audioRef.current.currentTime = 0;
        setIsMusicPlaying(false);
      }
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.muted = true;
      }
    };
  }, [isVisible, isUserMuted, hasAttachedMusic, musicUrl]);

  // Track views
  useViewTracking(item.type === 'reel' ? 'reel' : 'post', item.id, currentUserId, true);

  // Real-time comment count updates
  useEffect(() => {
    const tableName = item.type === 'post' ? 'post_comments' : 'reel_comments';
    const idColumn = item.type === 'post' ? 'post_id' : 'reel_id';
    
    const channel = supabase
      .channel(`comments-${item.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: tableName,
          filter: `${idColumn}=eq.${item.id}`
        },
        () => setCommentCount((prev: number) => prev + 1)
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: tableName,
          filter: `${idColumn}=eq.${item.id}`
        },
        () => setCommentCount((prev: number) => Math.max(0, prev - 1))
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [item.id, item.type]);

  // Handle double tap to like
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

  return (
    <div ref={containerRef} className="relative w-full bg-background">
      {/* Audio element for music */}
      {hasAttachedMusic && musicUrl && (
        <audio ref={audioRef} src={musicUrl} loop preload="auto" />
      )}

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
            <span className="font-semibold text-sm leading-tight flex items-center gap-1">
              {item.profiles?.username || 'Unknown'}
              {item.profiles?.is_verified && <VerifiedBadge size="xs" />}
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

      {/* Text-only posts */}
      {(!item.media_urls || item.media_urls.length === 0) && item.content && (
        <div className="px-3 py-4 relative" onClick={handleDoubleTap}>
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            {item.content}
          </p>
          
          {hasAttachedMusic && (
            <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-muted/50">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Music className={`w-5 h-5 text-primary ${isMusicPlaying ? 'animate-pulse' : ''}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {item.music_tracks?.title || 'Added Music'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.music_tracks?.artist || 'Unknown Artist'}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMute(videoKey);
                }}
                className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-all"
              >
                {mutedVideos.has(videoKey) ? (
                  <VolumeX className="w-4 h-4 text-primary" />
                ) : (
                  <Volume2 className="w-4 h-4 text-primary" />
                )}
              </button>
            </div>
          )}
          
          {doubleTapLike && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <Heart className="w-24 h-24 text-primary fill-primary animate-ping" style={{ animationDuration: '0.5s' }} />
            </div>
          )}
        </div>
      )}

      {/* Media content */}
      {item.media_urls && item.media_urls.length > 0 && (
        <div className="relative w-full bg-black" onClick={handleDoubleTap}>
          {item.media_urls.map((url: string, idx: number) => (
            <div key={idx} className="relative w-full aspect-[4/5]">
              {url.includes('.mp3') || url.includes('.wav') || url.includes('.ogg') || url.includes('audio') ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 p-6">
                  <audio src={url} controls className="w-full" />
                </div>
              ) : (item.type === 'reel' && !isImageReel) || url.includes('.mp4') || url.includes('video') ? (
                <div 
                  className="relative w-full h-full cursor-pointer"
                  onClick={item.type === 'reel' ? onFullscreen : undefined}
                >
                  <LazyVideo
                    src={url}
                    muted={!isVisible || shouldMuteVideo || mutedVideos.has(item.id + url)}
                    className="absolute inset-0 w-full h-full object-cover"
                    onVisibilityChange={handleVisibilityChange}
                  />
                  
                  {hasAttachedMusic && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 z-10">
                      <Music className="w-3 h-3 text-white" />
                      <span className="text-[10px] text-white font-medium truncate max-w-[100px]">
                        {item.music_tracks?.title || 'Added Music'}
                      </span>
                    </div>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMute(item.id + url);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all z-10"
                  >
                    {mutedVideos.has(item.id + url) ? (
                      <VolumeX className="w-4 h-4 text-white" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  <LazyImage src={url} alt="Post media" className="absolute inset-0 w-full h-full object-cover" />
                  
                  {hasAttachedMusic && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 z-10">
                      <Music className={`w-3 h-3 text-white ${isMusicPlaying ? 'animate-pulse' : ''}`} />
                      <span className="text-[10px] text-white font-medium truncate max-w-[100px]">
                        {item.music_tracks?.title || 'Added Music'}
                      </span>
                    </div>
                  )}
                  
                  {hasAttachedMusic && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleMute(videoKey);
                      }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-all z-10"
                    >
                      {mutedVideos.has(videoKey) ? (
                        <VolumeX className="w-4 h-4 text-white" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-white" />
                      )}
                    </button>
                  )}
                </div>
              )}

              {doubleTapLike && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <Heart className="w-24 h-24 text-white fill-white animate-ping" style={{ animationDuration: '0.5s' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-3 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLike();
              }}
              className="active:scale-75 transition-transform duration-100"
            >
              <Heart className={`w-7 h-7 ${isLiked ? 'fill-red-500 text-red-500' : 'text-foreground'}`} strokeWidth={1.5} />
            </button>

            <button onClick={() => setShowComments(true)} className="active:scale-75 transition-transform duration-100">
              <MessageCircle className="w-7 h-7 text-foreground" strokeWidth={1.5} />
            </button>

            <button onClick={onShare} className="active:scale-75 transition-transform duration-100">
              <Send className="w-7 h-7 text-foreground -rotate-12" strokeWidth={1.5} />
            </button>

            <button onClick={() => onRepost?.()} className="active:scale-75 transition-transform duration-100">
              <Repeat2 className={`w-7 h-7 ${isReposted ? 'text-green-500' : 'text-foreground'}`} strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setShowInsights(true)} className="active:scale-75 transition-transform duration-100">
              <Sparkles className="w-6 h-6 text-pink-400" />
            </button>

            <button onClick={() => onSave?.()} className="active:scale-75 transition-transform duration-100">
              <Bookmark className={`w-7 h-7 ${isSaved ? 'fill-foreground text-foreground' : 'text-foreground'}`} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Engagement Stats - only show counts > 0 */}
        <div className="flex items-center gap-4 mt-2 text-sm">
          {(item.like_count || 0) > 0 && (
            <button 
              onClick={() => setShowLikes(true)}
              className="font-semibold text-foreground hover:opacity-70 transition-opacity"
            >
              {item.like_count.toLocaleString()} likes
            </button>
          )}
          
          {(item.repost_count || 0) > 0 && (
            <button 
              onClick={() => setShowReposts(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.repost_count.toLocaleString()} reposts
            </button>
          )}
          
          {(item.save_count || 0) > 0 && (
            <button 
              onClick={() => setShowSaves(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.save_count.toLocaleString()} saves
            </button>
          )}
        </div>

        {/* Caption */}
        {'content' in item && item.content && item.media_urls && item.media_urls.length > 0 && (
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
        {commentCount > 0 && (
          <button 
            onClick={() => setShowComments(true)}
            className="text-sm text-muted-foreground mt-1 hover:text-foreground transition-colors"
          >
            View all {commentCount} comments
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
          comments: commentCount,
          shares: item.repost_count || 0,
          views: item.view_count || 0,
        }}
        createdAt={item.created_at}
      />
    </div>
  );
});

FeedItem.displayName = 'FeedItem';
