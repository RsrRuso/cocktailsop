import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import OptimizedAvatar from '@/components/OptimizedAvatar';
import { Badge } from '@/components/ui/badge';
import { Pin, Users } from 'lucide-react';

interface ConversationItemProps {
  conversation: {
    id: string;
    otherUser?: {
      id: string;
      username: string;
      full_name: string;
      avatar_url: string | null;
    };
    lastMessage?: string;
    last_message_at: string;
    unreadCount?: number;
    isPinned?: boolean;
    is_group?: boolean;
    group_name?: string;
    group_avatar_url?: string;
    memberCount?: number;
  };
}

export const ConversationItem = memo(({ conversation }: ConversationItemProps) => {
  const navigate = useNavigate();

  const displayName = conversation.is_group
    ? conversation.group_name
    : conversation.otherUser?.full_name || conversation.otherUser?.username;

  const avatarUrl = conversation.is_group
    ? conversation.group_avatar_url
    : conversation.otherUser?.avatar_url;

  const avatarFallback = conversation.is_group
    ? conversation.group_name?.[0] || '?'
    : conversation.otherUser?.username?.[0] || '?';

  return (
    <div
      onClick={() => navigate(`/messages/${conversation.id}`)}
      className="glass backdrop-blur-xl p-4 rounded-2xl cursor-pointer hover:scale-[1.02] transition-all border border-border/50 hover:border-primary/30"
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          {conversation.is_group ? (
            <Avatar className="w-14 h-14 border-2 border-primary/20">
              <AvatarImage src={avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5">
                <Users className="w-6 h-6" />
              </AvatarFallback>
            </Avatar>
          ) : (
            <OptimizedAvatar
              src={avatarUrl}
              alt={displayName || 'User'}
              fallback={avatarFallback}
              userId={conversation.otherUser?.id}
              className="w-14 h-14 border-2 border-primary/20"
            />
          )}
          {conversation.unreadCount && conversation.unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center p-1 bg-primary text-primary-foreground animate-pulse">
              {conversation.unreadCount}
            </Badge>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-base truncate">
              {displayName}
            </h3>
            {conversation.isPinned && (
              <Pin className="w-4 h-4 text-primary fill-primary flex-shrink-0" />
            )}
            {conversation.is_group && conversation.memberCount && (
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {conversation.memberCount} members
              </span>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground truncate">
            {conversation.lastMessage || 'No messages yet'}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(conversation.last_message_at), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>
    </div>
  );
});

ConversationItem.displayName = 'ConversationItem';
