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
  const hasMedia = message.media_url;
  const canEdit = isOwn && !hasMedia && onEdit;
  
  return (
    <div
      className={`absolute ${
        isOwn ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
      } top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-background/80 backdrop-blur-sm rounded-lg p-1 shadow-lg border border-border/50`}
    >
      <Button 
        size="icon" 
        variant="ghost" 
        className="h-7 w-7 glass hover:bg-primary/20 transition-colors" 
        onClick={onReaction}
        title="React"
      >
        <Smile className="h-4 w-4" />
      </Button>
      <Button 
        size="icon" 
        variant="ghost" 
        className="h-7 w-7 glass hover:bg-primary/20 transition-colors" 
        onClick={onReply}
        title="Reply"
      >
        <Reply className="h-4 w-4" />
      </Button>
      {canEdit && (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 glass hover:bg-primary/20 transition-colors"
          onClick={onEdit}
          title="Edit message"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      )}
      {isOwn && onDelete && (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 glass hover:bg-destructive/30 transition-colors"
          onClick={() => {
            if (confirm(`Are you sure you want to delete this ${hasMedia ? 'media' : 'message'}?`)) {
              onDelete();
            }
          }}
          title={`Delete ${hasMedia ? 'media' : 'message'}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  );
};
