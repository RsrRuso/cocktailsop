import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Search, Send, Check, Loader2, Mail, Lock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface ChannelInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  channelName: string;
}

export default function ChannelInviteDialog({
  open,
  onOpenChange,
  channelId,
  channelName,
}: ChannelInviteDialogProps) {
  const { user } = useAuth();
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && user) {
      fetchConnections();
      fetchExistingInvites();
    }
  }, [open, user]);

  const fetchConnections = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Fetch followers
      const { data: followerData } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id);
      
      // Fetch following
      const { data: followingData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      
      const followerIds = followerData?.map((f: any) => f.follower_id) || [];
      const followingIds = followingData?.map((f: any) => f.following_id) || [];
      
      // Fetch profiles
      if (followerIds.length > 0) {
        const { data: followerProfiles } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", followerIds);
        setFollowers(followerProfiles || []);
      }
      
      if (followingIds.length > 0) {
        const { data: followingProfiles } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", followingIds);
        setFollowing(followingProfiles || []);
      }
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingInvites = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from("channel_invitations")
        .select("invited_user_id")
        .eq("channel_id", channelId)
        .eq("status", "pending");
      
      if (data) {
        setSentInvites(new Set(data.map((i: any) => i.invited_user_id)));
      }
    } catch (error) {
      console.error("Error fetching existing invites:", error);
    }
  };

  const sendInvitation = async (recipientId: string, recipientName: string) => {
    if (!user) return;
    
    try {
      // Create invitation record
      const { error: inviteError } = await supabase
        .from("channel_invitations")
        .insert({
          channel_id: channelId,
          invited_by: user.id,
          invited_user_id: recipientId,
          status: "pending",
        });
      
      if (inviteError) throw inviteError;

      // Send internal email notification
      const { error: emailError } = await supabase
        .from("internal_emails")
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          subject: `Invitation to join "${channelName}" channel`,
          body: `You've been invited to join the private channel "${channelName}". Click to accept and join the conversation!`,
        });

      if (emailError) {
        console.error("Failed to send email notification:", emailError);
      }

      // Create notification
      await supabase
        .from("notifications")
        .insert({
          user_id: recipientId,
          type: "channel_invitation",
          content: `You've been invited to join "${channelName}"`,
          reference_user_id: user.id,
        });

      setSentInvites(prev => new Set([...prev, recipientId]));
      toast.success(`Invitation sent to ${recipientName}`);
    } catch (error: any) {
      console.error("Failed to send invitation:", error);
      toast.error("Failed to send invitation");
    }
  };

  const filterUsers = (users: Profile[]) => {
    if (!searchQuery) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      u =>
        u.username?.toLowerCase().includes(query) ||
        u.full_name?.toLowerCase().includes(query)
    );
  };

  const renderUserList = (users: Profile[], emptyMessage: string) => {
    const filtered = filterUsers(users);
    
    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-white/50" />
        </div>
      );
    }
    
    if (filtered.length === 0) {
      return (
        <p className="text-center text-white/50 py-8">{emptyMessage}</p>
      );
    }
    
    return filtered.map(profile => {
      const isSent = sentInvites.has(profile.id);
      return (
        <div
          key={profile.id}
          className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                {(profile.full_name || profile.username || "U")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-white">
                {profile.full_name || profile.username || "Unknown"}
              </p>
              {profile.username && (
                <p className="text-sm text-white/50">@{profile.username}</p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => sendInvitation(profile.id, profile.full_name || profile.username || "User")}
            disabled={isSent}
            className={isSent 
              ? "bg-green-600/20 text-green-400 border border-green-500/30"
              : "bg-blue-600 hover:bg-blue-700 text-white"
            }
          >
            {isSent ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Sent
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-1" />
                Invite
              </>
            )}
          </Button>
        </div>
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            Invite to {channelName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search connections..."
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>

          <Tabs defaultValue="following" className="w-full">
            <TabsList className="w-full bg-white/5">
              <TabsTrigger value="following" className="flex-1 data-[state=active]:bg-blue-600">
                Following
              </TabsTrigger>
              <TabsTrigger value="followers" className="flex-1 data-[state=active]:bg-blue-600">
                Followers
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="following">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {renderUserList(following, "You're not following anyone yet")}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="followers">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {renderUserList(followers, "You don't have any followers yet")}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-white/10 hover:bg-white/20 text-white"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
