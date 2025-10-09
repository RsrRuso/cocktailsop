import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

interface UserSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postContent: string;
  postId: string;
  postType: 'post' | 'reel';
  mediaUrls?: string[];
}

const UserSelectionDialog = ({ open, onOpenChange, postContent, postId, postType, mediaUrls }: UserSelectionDialogProps) => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", user.id)
      .order("full_name");

    if (data) {
      setUsers(data);
    }
  };

  const handleSendMessage = async (recipientId: string, postType: 'post' | 'reel', mediaUrls?: string[]) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please login to send messages");
      setLoading(false);
      return;
    }

    // Check if conversation exists
    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .contains("participant_ids", [user.id, recipientId])
      .single();

    let conversationId = existingConv?.id;

    // Create conversation if doesn't exist
    if (!conversationId) {
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          participant_ids: [user.id, recipientId],
        })
        .select()
        .single();

      if (error || !newConv) {
        toast.error("Failed to create conversation");
        setLoading(false);
        return;
      }
      conversationId = newConv.id;
    }

    // Send message with actual content and media
    const messageContent = postContent || `Shared a ${postType}`;
    
    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: messageContent,
        media_url: mediaUrls?.[0] || null,
        media_type: postType === 'reel' ? 'video' : 'image',
      });

    if (error) {
      toast.error("Failed to send message");
    } else {
      toast.success(`${postType === 'post' ? 'Post' : 'Reel'} shared successfully!`);
      onOpenChange(false);
      navigate(`/messages/${conversationId}`);
    }
    setLoading(false);
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send to
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {filteredUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No users found</p>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="glass-hover rounded-xl p-3 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 ring-1 ring-border">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{user.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSendMessage(user.id, postType, mediaUrls)}
                    disabled={loading}
                    className="glow-primary"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserSelectionDialog;
