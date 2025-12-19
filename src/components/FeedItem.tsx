import { memo, useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Send, Bookmark, MoreVertical, Trash2, Edit, Volume2, VolumeX, Eye, Repeat2, Music } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { LazyImage } from "@/components/LazyImage";
import { LazyVideo } from "@/components/LazyVideo";
import { useViewTracking } from "@/hooks/useViewTracking";
import { EngagementInsightsDialog, EnhancedLikesDialog, EnhancedCommentsDialog, InstagramReactions } from "@/components/engagement";
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

  // Handle emoji reaction
  const handleEmojiReaction = useCallback((emoji: string) => {
    toast.success(`Reacted with ${emoji}`);
    // Can extend to save reactions to database
  }, []);

  return (
    <div ref={containerRef} className="relative w-full bg-background">
      {/* Audio element for music */}
      {hasAttachedMusic && musicUrl && (
        <audio ref={audioRef} src={musicUrl} loop preload="auto" />
      )}

      {/* Header - User Info - Instagram style */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div 
          className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
          onClick={() => navigate(`/user/${item.user_id}`)}
        >
          <div className="relative flex-shrink-0">
            <OptimizedAvatar
              src={item.profiles?.avatar_url}
              alt={item.profiles?.username || 'User'}
              fallback={item.profiles?.username?.[0] || '?'}
              userId={item.user_id}
              className={`w-8 h-8 ring-1 ring-border/50`}
            />
            <UserStatusIndicator userId={item.user_id} size="sm" />
          </div>
          
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm leading-tight flex items-center gap-1 truncate">
              {item.profiles?.username || 'Unknown'}
              {item.profiles?.is_verified && <VerifiedBadge size="xs" />}
            </span>
            {item.profiles?.professional_title && (
              <span className="text-[11px] text-muted-foreground truncate">
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
        <InstagramReactions isLiked={isLiked} onLike={onLike} onReaction={handleEmojiReaction}>
          <div className="px-3 py-4 relative">
            <p className="text-base leading-relaxed whitespace-pre-wrap">
              {item.content}
            </p>
            
            {hasAttachedMusic && (
              <div className="flex items-center gap-1.5 mt-1 opacity-60">
                <Music className={`w-3 h-3 ${isMusicPlaying ? 'animate-pulse' : ''}`} />
                <span className="text-[11px] truncate max-w-[180px]">
                  {item.music_tracks?.title || 'Added Music'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMute(videoKey);
                  }}
                  className="ml-1 opacity-70 hover:opacity-100 transition-opacity"
                >
                  {mutedVideos.has(videoKey) ? (
                    <VolumeX className="w-3 h-3" />
                  ) : (
                    <Volume2 className="w-3 h-3" />
                  )}
                </button>
              </div>
            )}
          </div>
        </InstagramReactions>
      )}

      {/* Media content */}
      {item.media_urls && item.media_urls.length > 0 && (
        <InstagramReactions isLiked={isLiked} onLike={onLike} onReaction={handleEmojiReaction}>
          <div className="relative w-full bg-gradient-to-br from-muted to-secondary">
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
              </div>
            ))}
          </div>
        </InstagramReactions>
      )}

      {/* Instagram-style Action Buttons */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLike();
              }}
              className="active:scale-90 transition-transform p-0"
            >
              <Heart className={`w-7 h-7 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} strokeWidth={1.5} />
            </button>

            <button onClick={() => setShowComments(true)} className="active:scale-90 transition-transform p-0">
              <MessageCircle className="w-7 h-7" strokeWidth={1.5} />
            </button>

            <button onClick={onShare} className="active:scale-90 transition-transform p-0">
              <Send className="w-6 h-6 -rotate-12" strokeWidth={1.5} />
            </button>

            <button onClick={() => onRepost?.()} className="active:scale-90 transition-transform p-0">
              <Repeat2 className={`w-6 h-6 ${isReposted ? 'text-green-500' : ''}`} strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setShowInsights(true)} className="active:scale-90 transition-transform p-0">
              <Eye className="w-6 h-6 opacity-60" strokeWidth={1.5} />
            </button>

            <button onClick={() => onSave?.()} className="active:scale-90 transition-transform p-0">
              <Bookmark className={`w-7 h-7 ${isSaved ? 'fill-current' : ''}`} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Like count - Instagram style */}
        {(item.like_count || 0) > 0 && (
          <button 
            onClick={() => setShowLikes(true)}
            className="font-semibold text-sm mt-2 block"
          >
            {item.like_count.toLocaleString()} {item.like_count === 1 ? 'like' : 'likes'}
          </button>
        )}

        {/* Caption - Instagram style */}
        {'content' in item && item.content && item.media_urls && item.media_urls.length > 0 && (
          <p className="text-sm mt-1">
            <span 
              className="font-semibold mr-1 cursor-pointer"
              onClick={() => navigate(`/user/${item.user_id}`)}
            >
              {item.profiles?.username}
            </span>
            {item.content}
          </p>
        )}

        {/* View all comments - Instagram style */}
        {commentCount > 0 && (
          <button 
            onClick={() => setShowComments(true)}
            className="text-sm text-muted-foreground mt-1 block"
          >
            View all {commentCount} comments
          </button>
        )}

        {/* Views count - Instagram style */}
        <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
          <Eye className="w-4 h-4" />
          <span>{(item.view_count || 0).toLocaleString()} views</span>
        </div>

        {/* Reposts and saves in subtle text */}
        {((item.repost_count || 0) > 0 || (item.save_count || 0) > 0) && (
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            {(item.repost_count || 0) > 0 && (
              <button onClick={() => setShowReposts(true)}>
                {item.repost_count} reposts
              </button>
            )}
            {(item.save_count || 0) > 0 && (
              <button onClick={() => setShowSaves(true)}>
                {item.save_count} saves
              </button>
            )}
          </div>
        )}
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
