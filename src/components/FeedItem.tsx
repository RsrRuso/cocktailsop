import { memo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Send, MoreVertical, Trash2, Edit, Volume2, VolumeX, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EnhancedCommentsDialog } from "@/components/engagement";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

// Lightweight media component
const MediaItem = memo(({ url, itemId, isReel, isMuted, onToggleMute, onFullscreen }: {
  url: string;
  itemId: string;
  isReel: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onFullscreen: () => void;
}) => {
  const isAudio = url.includes('.mp3') || url.includes('.wav') || url.includes('audio');
  const isVideo = isReel || url.includes('.mp4') || url.includes('video');

  if (isAudio) {
    return (
      <div className="bg-muted/50 p-4">
        <audio src={url} controls className="w-full h-10" />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="relative" onClick={isReel ? onFullscreen : undefined}>
        <video
          src={url}
          className="w-full max-h-[70vh] object-cover bg-black"
          autoPlay
          loop
          muted={!isMuted}
          playsInline
        />
        <button
          onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
        >
          {isMuted ? <Volume2 className="w-4 h-4 text-white" /> : <VolumeX className="w-4 h-4 text-white" />}
        </button>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt=""
      className="w-full max-h-[70vh] object-cover"
      loading="lazy"
    />
  );
});
MediaItem.displayName = 'MediaItem';

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
  getBadgeColor
}: FeedItemProps) => {
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const isOwner = currentUserId === item.user_id;

  const handleProfileClick = useCallback(() => {
    navigate(`/user/${item.user_id}`);
  }, [navigate, item.user_id]);

  return (
    <article className="bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <button onClick={handleProfileClick} className="shrink-0">
          <Avatar className={`w-10 h-10 ring-2 ring-offset-1 ring-offset-background ${item.profiles?.badge_level ? `ring-${getBadgeColor(item.profiles.badge_level).split(' ')[0].replace('from-', '')}` : 'ring-muted'}`}>
            <AvatarImage src={item.profiles?.avatar_url} />
            <AvatarFallback className="text-xs">{item.profiles?.username?.[0] || '?'}</AvatarFallback>
          </Avatar>
        </button>

        <button onClick={handleProfileClick} className="flex-1 text-left min-w-0">
          <p className="font-medium text-sm truncate">{item.profiles?.full_name || item.profiles?.username}</p>
          {item.profiles?.professional_title && (
            <p className="text-xs text-muted-foreground truncate">
              {item.profiles.professional_title.replace(/_/g, " ")}
            </p>
          )}
        </button>

        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-full hover:bg-muted/50 transition-colors">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {item.type === 'post' && (
                <DropdownMenuItem onClick={onEdit} className="text-sm">
                  <Edit className="w-3.5 h-3.5 mr-2" /> Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDelete} className="text-sm text-destructive">
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content */}
      {item.content && (
        <p className="px-3 pb-2 text-sm">{item.content}</p>
      )}

      {/* Media */}
      {item.media_urls?.length > 0 && (
        <div className="bg-black">
          {item.media_urls.map((url: string, idx: number) => (
            <MediaItem
              key={idx}
              url={url}
              itemId={item.id}
              isReel={item.type === 'reel'}
              isMuted={mutedVideos.has(item.id + url)}
              onToggleMute={() => onToggleMute(item.id + url)}
              onFullscreen={onFullscreen}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 px-3 py-2.5">
        <button onClick={onLike} className="flex items-center gap-1.5 group">
          <Heart className={`w-5 h-5 transition-transform group-active:scale-90 ${isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
          <span className="text-xs text-muted-foreground">{item.like_count || 0}</span>
        </button>

        <button onClick={() => setShowComments(true)} className="flex items-center gap-1.5 group">
          <MessageCircle className="w-5 h-5 text-muted-foreground transition-transform group-active:scale-90" />
          <span className="text-xs text-muted-foreground">{item.comment_count || 0}</span>
        </button>

        <button onClick={onShare} className="group">
          <Send className="w-5 h-5 text-muted-foreground transition-transform group-active:scale-90" />
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Eye className="w-4 h-4" />
          <span>{item.view_count || 0}</span>
        </div>
      </div>

      {/* Comments Dialog */}
      <EnhancedCommentsDialog
        open={showComments}
        onOpenChange={setShowComments}
        contentType={item.type}
        contentId={item.id}
        onCommentChange={onComment}
      />
    </article>
  );
});

FeedItem.displayName = 'FeedItem';