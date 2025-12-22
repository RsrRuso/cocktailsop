import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Users, Hash, Lock, Megaphone, Bell, BellOff, 
  UserPlus, LogOut, Settings, Crown, Shield
} from "lucide-react";
import { format } from "date-fns";

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

interface Member {
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
}

interface CommunityChannelInfoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
  isMember: boolean;
  onJoin: () => void;
  onLeave: () => void;
}

export default function CommunityChannelInfo({
  open,
  onOpenChange,
  channel,
  isMember,
  onJoin,
  onLeave,
}: CommunityChannelInfoProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && channel) {
      fetchMembers();
    }
  }, [open, channel]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("community_channel_members")
        .select("user_id, role, joined_at")
        .eq("channel_id", channel.id)
        .order("joined_at", { ascending: true })
        .limit(50);

      if (error) throw error;

      // Fetch profiles
      const userIds = data?.map((m) => m.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, full_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      setMembers(
        data?.map((m) => ({
          ...m,
          profile: profileMap.get(m.user_id),
        })) || []
      );
    } catch (error) {
      console.error("Failed to fetch members:", error);
    } finally {
      setLoading(false);
    }
  };

  const getChannelIcon = () => {
    switch (channel.type) {
      case "announcement":
        return <Megaphone className="w-6 h-6" />;
      case "private":
        return <Lock className="w-6 h-6" />;
      default:
        return <Hash className="w-6 h-6" />;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="w-3 h-3 text-yellow-400" />;
      case "moderator":
        return <Shield className="w-3 h-3 text-blue-400" />;
      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md bg-slate-900 border-white/10 text-white p-0">
        <SheetHeader className="p-6 pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {channel.avatar_url ? (
                <AvatarImage src={channel.avatar_url} />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-blue-500/30 to-purple-500/30 text-blue-400">
                  {getChannelIcon()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-white flex items-center gap-2">
                {channel.name}
                {channel.is_official && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-0 text-xs">
                    Official
                  </Badge>
                )}
              </SheetTitle>
              <p className="text-sm text-white/50 capitalize">{channel.type} · {channel.category}</p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="px-6 space-y-6">
            {/* Description */}
            {channel.description && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-white/70">Description</h3>
                <p className="text-sm text-white/80">{channel.description}</p>
              </div>
            )}

            {/* Stats */}
            <div className="flex gap-6">
              <div>
                <p className="text-2xl font-bold text-white">{channel.member_count}</p>
                <p className="text-xs text-white/50">Members</p>
              </div>
              <div>
                <p className="text-sm text-white/80">
                  {format(new Date(channel.created_at), "MMM d, yyyy")}
                </p>
                <p className="text-xs text-white/50">Created</p>
              </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Actions */}
            <div className="space-y-2">
              {isMember ? (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <Bell className="w-4 h-4 mr-3" />
                    Notifications
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={onLeave}
                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Leave Channel
                  </Button>
                </>
              ) : (
                <Button
                  onClick={onJoin}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Join Channel
                </Button>
              )}
            </div>

            <Separator className="bg-white/10" />

            {/* Members */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Members
                </h3>
                <span className="text-xs text-white/40">{members.length}</span>
              </div>

              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.profile?.avatar_url || ""} />
                      <AvatarFallback className="bg-blue-500/20 text-blue-400 text-sm">
                        {member.profile?.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">
                          {member.profile?.full_name || member.profile?.username || "Unknown"}
                        </span>
                        {getRoleIcon(member.role)}
                      </div>
                      <p className="text-xs text-white/40">
                        Joined {format(new Date(member.joined_at), "MMM d")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
