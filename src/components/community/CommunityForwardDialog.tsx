import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Check, Forward, Hash, Megaphone, Lock } from "lucide-react";
import { toast } from "sonner";

interface Channel {
  id: string;
  name: string;
  avatar_url: string | null;
  type: string;
}

interface Message {
  id: string;
  content: string | null;
  user_id: string;
  profile?: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
}

interface CommunityForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message | null;
  userId: string;
}

export default function CommunityForwardDialog({
  open,
  onOpenChange,
  message,
  userId,
}: CommunityForwardDialogProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState(false);

  useEffect(() => {
    if (open) {
      fetchChannels();
    }
  }, [open]);

  const fetchChannels = async () => {
    setLoading(true);
    try {
      // Get channels user is member of
      const { data: memberships } = await supabase
        .from("community_channel_members")
        .select("channel_id")
        .eq("user_id", userId);

      const channelIds = memberships?.map(m => m.channel_id) || [];

      const { data: channelsData } = await supabase
        .from("community_channels")
        .select("id, name, avatar_url, type")
        .in("id", channelIds);

      setChannels(channelsData || []);
    } catch (error) {
      console.error("Failed to load channels:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = (channelId: string) => {
    setSelectedChannels(prev =>
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleForward = async () => {
    if (!message || selectedChannels.length === 0) return;

    setForwarding(true);
    try {
      // Create forwarded message content with original sender info
      const forwardedContent = message.content;
      const forwardedFrom = message.profile?.username || "Unknown";

      // Insert messages to all selected channels
      const inserts = selectedChannels.map(channelId => ({
        channel_id: channelId,
        user_id: userId,
        content: `📨 Forwarded from @${forwardedFrom}:\n\n${forwardedContent}`,
      }));

      const { error } = await supabase
        .from("community_messages")
        .insert(inserts);

      if (error) throw error;

      toast.success(`Forwarded to ${selectedChannels.length} channel${selectedChannels.length > 1 ? 's' : ''}`);
      onOpenChange(false);
      setSelectedChannels([]);
    } catch (error) {
      console.error("Failed to forward:", error);
      toast.error("Failed to forward message");
    } finally {
      setForwarding(false);
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case "announcement":
        return <Megaphone className="w-4 h-4" />;
      case "private":
        return <Lock className="w-4 h-4" />;
      default:
        return <Hash className="w-4 h-4" />;
    }
  };

  const filteredChannels = channels.filter(ch =>
    ch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Forward className="w-5 h-5 text-blue-400" />
            Forward Message
          </DialogTitle>
        </DialogHeader>

        {/* Original message preview */}
        {message && (
          <div className="p-3 bg-white/5 rounded-lg border border-white/10 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={message.profile?.avatar_url || ""} />
                <AvatarFallback className="bg-blue-500/20 text-blue-400 text-xs">
                  {message.profile?.username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-white/70">
                {message.profile?.username || "Unknown"}
              </span>
            </div>
            <p className="text-sm text-white/80 line-clamp-3">{message.content}</p>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>

        {/* Channels list */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-1">
            {filteredChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => toggleChannel(channel.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  selectedChannels.includes(channel.id)
                    ? "bg-blue-500/20 border border-blue-500/40"
                    : "hover:bg-white/5"
                }`}
              >
                <Avatar className="h-10 w-10">
                  {channel.avatar_url ? (
                    <AvatarImage src={channel.avatar_url} />
                  ) : (
                    <AvatarFallback className="bg-slate-700 text-white/60">
                      {getChannelIcon(channel.type)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="flex-1 text-left text-white font-medium">
                  {channel.name}
                </span>
                {selectedChannels.includes(channel.id) && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Forward button */}
        <Button
          onClick={handleForward}
          disabled={selectedChannels.length === 0 || forwarding}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4"
        >
          {forwarding ? (
            "Forwarding..."
          ) : selectedChannels.length > 0 ? (
            `Forward to ${selectedChannels.length} channel${selectedChannels.length > 1 ? 's' : ''}`
          ) : (
            "Select channels to forward"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
