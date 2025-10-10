import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Send, MoreVertical, Trash2, Edit } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import OptimizedAvatar from './OptimizedAvatar';

interface FeedPostProps {
  item: any;
  currentUserId?: string;
  isLiked: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onDelete: () => void;
  onEdit: () => void;
  getBadgeColor: (level: string) => string;
}

const FeedPost = memo(({ 
  item, 
  currentUserId, 
  isLiked, 
  onLike, 
  onComment, 
  onShare,
  onDelete,
  onEdit,
  getBadgeColor 
}: FeedPostProps) => {
  const navigate = useNavigate();
  const isOwnPost = currentUserId === item.user_id;

  return (
    <div className="glass rounded-3xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate(`/user/${item.user_id}`)}
        >
          <OptimizedAvatar
            src={item.profiles?.avatar_url}
            alt={item.profiles?.username || 'User'}
            className="w-10 h-10"
          />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">{item.profiles?.full_name}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r ${getBadgeColor(item.profiles?.badge_level || 'bronze')} text-white font-bold`}>
                {item.profiles?.badge_level?.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">@{item.profiles?.username}</p>
          </div>
        </div>
        {isOwnPost && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 hover:bg-primary/10 rounded-full transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content */}
      {item.content && (
        <p className="text-sm leading-relaxed">{item.content}</p>
      )}

      {/* Media */}
      {item.type === 'post' && item.media_urls?.[0] && (
        <div className="rounded-2xl overflow-hidden">
          <img 
            src={item.media_urls[0]} 
            alt="Post"
            className="w-full object-cover max-h-96"
            loading="lazy"
          />
        </div>
      )}

      {item.type === 'reel' && (
        <div className="rounded-2xl overflow-hidden aspect-video">
          <video 
            src={item.video_url} 
            className="w-full h-full object-cover"
            controls
            preload="metadata"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={onLike}
            className="flex items-center gap-2 group"
          >
            <Heart className={`w-6 h-6 transition-all group-hover:scale-110 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            <span className="text-sm font-medium">{item.like_count || 0}</span>
          </button>
          <button 
            onClick={onComment}
            className="flex items-center gap-2 group"
          >
            <MessageCircle className="w-6 h-6 transition-all group-hover:scale-110" />
            <span className="text-sm font-medium">{item.comment_count || 0}</span>
          </button>
        </div>
        <button 
          onClick={onShare}
          className="p-2 hover:bg-primary/10 rounded-full transition-all"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});

FeedPost.displayName = 'FeedPost';

export default FeedPost;
