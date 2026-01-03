import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Search, Plus, Users, 
  Hash, Megaphone, Globe, Lock, 
  UserPlus, TrendingUp, Star, Zap
} from "lucide-react";
import { toast } from "sonner";
import CommunityCreateChannelDialog from "@/components/community/CommunityCreateChannelDialog";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useWasabiData, CommunityChannel } from "@/hooks/useWasabiData";

const Wasabi = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [createChannelOpen, setCreateChannelOpen] = useState(false);

  const {
    channels,
    memberships,
    channelsLoading,
    fetchChannels,
  } = useWasabiData();

  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels;
    return channels.filter(ch => 
      ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [channels, searchQuery]);

  const joinedChannels = filteredChannels.filter((ch) => memberships.has(ch.id));
  const discoverChannels = filteredChannels.filter((ch) => !memberships.has(ch.id));

  const getChannelIcon = useCallback((channel: CommunityChannel) => {
    switch (channel.type) {
      case "announcement": return <Megaphone className="w-5 h-5" />;
      case "private": return <Lock className="w-5 h-5" />;
      default: return <Hash className="w-5 h-5" />;
    }
  }, []);

  const handleJoinChannel = async (channelId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("community_channel_members")
      .insert({ channel_id: channelId, user_id: user.id, role: "member" });

    if (error) {
      if (error.code === "23505") {
        toast.info("Already a member");
      } else {
        toast.error("Failed to join");
      }
      return;
    }

    const channel = channels.find(c => c.id === channelId);
    if (channel) {
      await supabase
        .from("community_channels")
        .update({ member_count: (channel.member_count || 0) + 1 })
        .eq("id", channelId);
    }

    toast.success("Joined channel!");
    fetchChannels();
  };

  const renderChannelItem = useCallback((channel: CommunityChannel, isJoined: boolean) => (
    <div
      key={channel.id}
      className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
      onClick={() => navigate(`/community?channel=${channel.id}`)}
    >
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center",
        channel.is_official ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-white/10"
      )}>
        {channel.avatar_url ? (
          <Avatar className="w-12 h-12 rounded-xl">
            <AvatarImage src={channel.avatar_url} />
            <AvatarFallback>{getChannelIcon(channel)}</AvatarFallback>
          </Avatar>
        ) : (
          getChannelIcon(channel)
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-white truncate">{channel.name}</h3>
          {channel.is_official && (
            <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs">
              <Star className="w-3 h-3 mr-1" />
              Official
            </Badge>
          )}
        </div>
        <p className="text-sm text-white/60 truncate">{channel.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <Users className="w-3 h-3 text-white/40" />
          <span className="text-xs text-white/40">{channel.member_count || 0} members</span>
        </div>
      </div>

      {!isJoined && (
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700"
          onClick={(e) => { e.stopPropagation(); handleJoinChannel(channel.id); }}
        >
          <UserPlus className="w-4 h-4 mr-1" />
          Join
        </Button>
      )}
    </div>
  ), [navigate, getChannelIcon, handleJoinChannel]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 pb-20 pt-16">
      <TopNav />
      
      {/* Header */}
      <div className="sticky top-16 z-10 bg-slate-900/95 backdrop-blur border-b border-white/10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white/70 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">Community</h1>
                <p className="text-xs text-white/50">Discover & Join Channels</p>
              </div>
            </div>
            
            <Button 
              size="icon" 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setCreateChannelOpen(true)}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ScrollArea className="h-[calc(100vh-220px)]">
          {channelsLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
            </div>
          ) : (
            <div className="px-4 py-4 space-y-6">
              {/* Joined Channels */}
              {joinedChannels.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Your Channels
                  </h3>
                  <div className="space-y-2">
                    {joinedChannels.map(ch => renderChannelItem(ch, true))}
                  </div>
                </div>
              )}

              {/* Discover Channels */}
              {discoverChannels.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Discover
                  </h3>
                  <div className="space-y-2">
                    {discoverChannels.map(ch => renderChannelItem(ch, false))}
                  </div>
                </div>
              )}

              {filteredChannels.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Globe className="w-16 h-16 text-white/20 mb-4" />
                  <h3 className="font-semibold text-white mb-1">No channels found</h3>
                  <p className="text-sm text-white/50 mb-4">Create a new channel or search differently</p>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => setCreateChannelOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Channel
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </motion.div>

      <CommunityCreateChannelDialog 
        open={createChannelOpen} 
        onOpenChange={setCreateChannelOpen}
        onChannelCreated={() => {
          setCreateChannelOpen(false);
          fetchChannels();
        }}
      />

      <BottomNav />
    </div>
  );
};

export default Wasabi;
