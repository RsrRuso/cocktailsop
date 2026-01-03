import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, Mail, Send, Users, UserPlus, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface WasabiShareChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  chatName: string;
}

export const WasabiShareChatDialog = ({
  open,
  onOpenChange,
  chatId,
  chatName,
}: WasabiShareChatDialogProps) => {
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const chatLink = `${window.location.origin}/wasabi/chat/${chatId}`;

  useEffect(() => {
    if (open) {
      fetchConnections();
    }
  }, [open]);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Fetch followers (people who follow me)
      const { data: followersData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id);

      // Fetch following (people I follow)
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followerIds = followersData?.map(f => f.follower_id) || [];
      const followingIds = followingData?.map(f => f.following_id) || [];

      // Fetch profiles for both
      if (followerIds.length > 0) {
        const { data: followerProfiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', followerIds);
        setFollowers(followerProfiles || []);
      }

      if (followingIds.length > 0) {
        const { data: followingProfiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', followingIds);
        setFollowing(followingProfiles || []);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendInternalEmail = async (recipientId: string, recipientName: string) => {
    if (!currentUserId) return;
    setSending(recipientId);
    
    try {
      const { error } = await supabase.from('internal_emails').insert({
        sender_id: currentUserId,
        recipient_id: recipientId,
        subject: `Chat Invitation: ${chatName}`,
        body: `
          <div style="font-family: system-ui, sans-serif;">
            <h2 style="color: #22c55e;">You've been invited to join a chat!</h2>
            <p>You've received an invitation to join the chat "<strong>${chatName}</strong>".</p>
            <p style="margin: 20px 0;">
              <a href="${chatLink}" style="background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                Join Chat
              </a>
            </p>
            <p style="color: #888; font-size: 14px;">Or copy this link: ${chatLink}</p>
          </div>
        `,
        is_draft: false,
        read: false,
        starred: false,
        archived: false,
      });

      if (error) throw error;

      // Also create a notification
      await supabase.from('notifications').insert({
        user_id: recipientId,
        type: 'internal_email',
        content: `You received a chat invitation for "${chatName}"`,
        read: false,
      });

      setSentTo(prev => new Set([...prev, recipientId]));
      toast.success(`Invitation sent to ${recipientName}`);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send invitation');
    } finally {
      setSending(null);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(chatLink);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const filterUsers = (users: Profile[]) => {
    if (!searchQuery) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(u => 
      u.username?.toLowerCase().includes(query) || 
      u.full_name?.toLowerCase().includes(query)
    );
  };

  const renderUserList = (users: Profile[], emptyMessage: string) => {
    const filtered = filterUsers(users);
    
    if (loading) {
      return (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (filtered.length === 0) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {filtered.map((user) => {
          const isSent = sentTo.has(user.id);
          const isSending = sending === user.id;
          
          return (
            <div
              key={user.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Avatar>
                <AvatarImage src={user.avatar_url || ''} />
                <AvatarFallback>
                  {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user.full_name || user.username || 'Unknown'}</p>
                {user.username && (
                  <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                )}
              </div>
              <Button
                size="sm"
                variant={isSent ? "outline" : "default"}
                onClick={() => sendInternalEmail(user.id, user.full_name || user.username || 'User')}
                disabled={isSending || isSent}
                className="gap-1.5"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSent ? (
                  <>
                    <Check className="w-4 h-4" />
                    Sent
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Share Chat
          </DialogTitle>
        </DialogHeader>

        {/* Copy Link Section */}
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <Input
            value={chatLink}
            readOnly
            className="flex-1 bg-background text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={copyLink}
            className="gap-1.5 shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="following" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="following" className="gap-1.5">
              <UserPlus className="w-4 h-4" />
              Following ({following.length})
            </TabsTrigger>
            <TabsTrigger value="followers" className="gap-1.5">
              <Users className="w-4 h-4" />
              Followers ({followers.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="following" className="mt-3">
            <ScrollArea className="h-[250px]">
              {renderUserList(following, "You're not following anyone yet")}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="followers" className="mt-3">
            <ScrollArea className="h-[250px]">
              {renderUserList(followers, "No followers yet")}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
};
