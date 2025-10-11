import { Message } from '@/hooks/useMessageThread';
import { Button } from './ui/button';
import { Smile, Reply, Edit2, Trash2 } from 'lucide-react';

interface MessageActionsProps {
  message: Message;
  isOwn: boolean;
  onReaction: () => void;
  onReply: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const MessageActions = ({
  message,
  isOwn,
  onReaction,
  onReply,
  onEdit,
  onDelete,
}: MessageActionsProps) => {
  return (
    <div
      className={`absolute ${
        isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
      } top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}
    >
      <Button size="icon" variant="ghost" className="h-6 w-6 glass" onClick={onReaction}>
        <Smile className="h-3 w-3" />
      </Button>
      <Button size="icon" variant="ghost" className="h-6 w-6 glass" onClick={onReply}>
        <Reply className="h-3 w-3" />
      </Button>
      {isOwn && onEdit && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 glass hover:bg-primary/20"
          onClick={onEdit}
          title="Edit message"
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      )}
      {isOwn && onDelete && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 glass hover:bg-destructive/20"
          onClick={() => {
            const mediaTypeLabel = message.media_type === 'image' ? 'photo' : 
                                  message.media_type === 'video' ? 'video' : 
                                  message.media_type === 'voice' ? 'voice recording' : 'message';
            if (confirm(`Delete this ${mediaTypeLabel}?`)) {
              onDelete();
            }
          }}
          title="Delete message"
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      )}
    </div>
  );
};
