import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { WasabiShareChatDialog } from "./WasabiShareChatDialog";

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface WasabiNewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated: (chatId: string) => void;
}

export const WasabiNewChatDialog = ({
  open,
  onOpenChange,
  onChatCreated,
}: WasabiNewChatDialogProps) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  
  // Share dialog state
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [createdChatId, setCreatedChatId] = useState<string | null>(null);
  const [createdChatName, setCreatedChatName] = useState("");

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .neq('id', user.id)
        .limit(50);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = async (otherUser: Profile) => {
    setCreating(otherUser.id);
    try {
      // Use atomic server-side function to get or create DM
      const { data, error } = await supabase.rpc('wasabi_get_or_create_dm', {
        other_user_id: otherUser.id
      });

      if (error) throw error;

      const chatId = data;
      const chatName = otherUser.full_name || otherUser.username || 'Chat';
      
      // Store for share dialog
      setCreatedChatId(chatId);
      setCreatedChatName(chatName);
      
      onChatCreated(chatId);
      onOpenChange(false);
      
      // Show share dialog after a brief delay
      setTimeout(() => {
        setShowShareDialog(true);
      }, 300);
      
      toast.success('Chat created!');
    } catch (error: any) {
      console.error('Error creating chat:', error);
      toast.error(error?.message || 'Failed to create chat');
    } finally {
      setCreating(null);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      user.username?.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Chat</DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                No users found
              </div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleCreateChat(user)}
                    disabled={creating === user.id}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
                  >
                    <Avatar>
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback>
                        {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{user.full_name || user.username || 'Unknown'}</p>
                      {user.username && user.full_name && (
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                      )}
                    </div>
                    {creating === user.id && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Share Dialog - appears after chat is created */}
      {createdChatId && (
        <WasabiShareChatDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          chatId={createdChatId}
          chatName={createdChatName}
        />
      )}
    </>
  );
};
