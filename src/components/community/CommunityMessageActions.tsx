import { memo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  MoreVertical, Reply, Copy, Pin, Forward, 
  Edit, Trash2, Flag, Share2
} from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface Message {
  id: string;
  content: string | null;
  user_id: string;
  is_pinned: boolean;
}

interface CommunityMessageActionsProps {
  message: Message;
  isOwn: boolean;
  isAdmin: boolean;
  onReply: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
  onForward?: () => void;
  onCopy?: () => void;
  onReport?: () => void;
}

function CommunityMessageActionsComponent({
  message,
  isOwn,
  isAdmin,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onUnpin,
  onForward,
  onCopy,
  onReport,
}: CommunityMessageActionsProps) {
  const handleAction = async (action: () => void) => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {}
    action();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-white/40 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="bg-slate-800 border-white/10 min-w-[160px]"
      >
        <DropdownMenuItem
          onClick={() => handleAction(onReply)}
          className="text-white/80 hover:bg-white/10 focus:bg-white/10"
        >
          <Reply className="w-4 h-4 mr-2" />
          Reply
        </DropdownMenuItem>

        {message.content && onCopy && (
          <DropdownMenuItem
            onClick={() => handleAction(() => {
              navigator.clipboard.writeText(message.content!);
              onCopy();
            })}
            className="text-white/80 hover:bg-white/10 focus:bg-white/10"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Text
          </DropdownMenuItem>
        )}

        {onForward && (
          <DropdownMenuItem
            onClick={() => handleAction(onForward)}
            className="text-white/80 hover:bg-white/10 focus:bg-white/10"
          >
            <Forward className="w-4 h-4 mr-2" />
            Forward
          </DropdownMenuItem>
        )}

        {(isAdmin || isOwn) && (
          <>
            <DropdownMenuSeparator className="bg-white/10" />
            
            {message.is_pinned ? (
              onUnpin && (
                <DropdownMenuItem
                  onClick={() => handleAction(onUnpin)}
                  className="text-white/80 hover:bg-white/10 focus:bg-white/10"
                >
                  <Pin className="w-4 h-4 mr-2" />
                  Unpin
                </DropdownMenuItem>
              )
            ) : (
              onPin && (
                <DropdownMenuItem
                  onClick={() => handleAction(onPin)}
                  className="text-white/80 hover:bg-white/10 focus:bg-white/10"
                >
                  <Pin className="w-4 h-4 mr-2" />
                  Pin Message
                </DropdownMenuItem>
              )
            )}
          </>
        )}

        {isOwn && onEdit && (
          <DropdownMenuItem
            onClick={() => handleAction(onEdit)}
            className="text-white/80 hover:bg-white/10 focus:bg-white/10"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </DropdownMenuItem>
        )}

        {(isOwn || isAdmin) && onDelete && (
          <DropdownMenuItem
            onClick={() => handleAction(onDelete)}
            className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        )}

        {!isOwn && onReport && (
          <>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={() => handleAction(onReport)}
              className="text-orange-400 hover:bg-orange-500/10 focus:bg-orange-500/10"
            >
              <Flag className="w-4 h-4 mr-2" />
              Report
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const CommunityMessageActions = memo(CommunityMessageActionsComponent);
