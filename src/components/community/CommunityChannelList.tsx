import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, Users } from "lucide-react";
import { motion } from "framer-motion";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  type: string;
  category: string;
  member_count: number;
  is_official: boolean;
  is_pinned: boolean;
  created_by: string | null;
  created_at: string;
}

interface Membership {
  channel_id: string;
  role: string;
  is_muted: boolean;
}

interface CommunityChannelListProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  memberships: Map<string, Membership>;
  onSelectChannel: (channel: Channel) => void;
  onJoinChannel: (channelId: string) => void;
  onLeaveChannel: (channelId: string) => void;
  getChannelIcon: (channel: Channel) => React.ReactNode;
  showJoinButton?: boolean;
}

export default function CommunityChannelList({
  channels,
  selectedChannel,
  memberships,
  onSelectChannel,
  onJoinChannel,
  getChannelIcon,
  showJoinButton = false,
}: CommunityChannelListProps) {
  return (
    <div className="space-y-1 px-2">
      {channels.map((channel) => {
        const isSelected = selectedChannel?.id === channel.id;
        const isMember = memberships.has(channel.id);

        return (
          <motion.div
            key={channel.id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
              isSelected
                ? "bg-blue-600/30 border border-blue-500/50"
                : "hover:bg-white/5"
            }`}
            onClick={() => onSelectChannel(channel)}
          >
            <Avatar className="h-12 w-12 flex-shrink-0 bg-blue-500/20">
              {channel.avatar_url ? (
                <AvatarImage src={channel.avatar_url} />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-blue-400">
                  {getChannelIcon(channel)}
                </AvatarFallback>
              )}
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white truncate">
                  {channel.name}
                </span>
                {channel.is_official && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-400">
                    Official
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Users className="w-3 h-3" />
                <span>{channel.member_count}</span>
                {channel.description && (
                  <>
                    <span>·</span>
                    <span className="truncate">{channel.description}</span>
                  </>
                )}
              </div>
            </div>

            {showJoinButton && !isMember && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onJoinChannel(channel.id);
                }}
                className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 flex-shrink-0"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
