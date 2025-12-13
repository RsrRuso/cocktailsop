import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { UserPlus, Check, Loader2 } from "lucide-react";

interface AddFifoEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | null;
  onEmployeeAdded: () => void;
}

export function AddFifoEmployeeDialog({ 
  open, 
  onOpenChange, 
  workspaceId,
  onEmployeeAdded 
}: AddFifoEmployeeDialogProps) {
  const { user } = useAuth();
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [addingUsers, setAddingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && user) {
      fetchFollowersAndFollowing();
    }
  }, [open, user]);

  const fetchFollowersAndFollowing = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch followers
      const { data: followersData } = await supabase
        .from("follows")
        .select(`
          follower_id,
          profiles:follower_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("following_id", user.id);

      // Fetch following
      const { data: followingData } = await supabase
        .from("follows")
        .select(`
          following_id,
          profiles:following_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("follower_id", user.id);

      setFollowers(followersData?.map(f => f.profiles).filter(Boolean) || []);
      setFollowing(followingData?.map(f => f.profiles).filter(Boolean) || []);
    } catch (error) {
      console.error("Error fetching followers/following:", error);
      toast.error("Failed to load followers/following");
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (selectedUser: any) => {
    if (!user || !selectedUser) return;
    
    setAddingUsers(prev => new Set(prev).add(selectedUser.id));

    try {
      // Create employee record
      const { error } = await supabase.from("fifo_employees").insert({
        user_id: user.id,
        workspace_id: workspaceId,
        name: selectedUser.full_name || selectedUser.username,
        title: "Team Member" // Default title
      });

      if (error) {
        // Check if already exists
        if (error.code === '23505') {
          toast.info(`${selectedUser.full_name || selectedUser.username} is already in your team`);
        } else {
          throw error;
        }
      } else {
        toast.success(`${selectedUser.full_name || selectedUser.username} added to team`);
        onEmployeeAdded();
      }
    } catch (error: any) {
      console.error("Error adding employee:", error);
      toast.error("Failed to add team member");
    } finally {
      setAddingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedUser.id);
        return newSet;
      });
    }
  };

  const filterUsers = (users: any[]) => {
    if (!searchTerm) return users;
    const search = searchTerm.toLowerCase();
    return users.filter(user => 
      user.full_name?.toLowerCase().includes(search) ||
      user.username?.toLowerCase().includes(search)
    );
  };

  const UserList = ({ users }: { users: any[] }) => {
    const filteredUsers = filterUsers(users);
    
    if (filteredUsers.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {searchTerm ? "No users found matching your search" : "No users to display"}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filteredUsers.map((selectedUser) => (
          <div 
            key={selectedUser.id}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedUser.avatar_url} />
                <AvatarFallback>
                  {(selectedUser.full_name || selectedUser.username)?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {selectedUser.full_name || selectedUser.username}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  @{selectedUser.username}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddEmployee(selectedUser)}
              disabled={addingUsers.has(selectedUser.id)}
              className="ml-2"
            >
              {addingUsers.has(selectedUser.id) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Team Members from Network</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search by name or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9"
          />

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="followers" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="followers">
                  Followers ({followers.length})
                </TabsTrigger>
                <TabsTrigger value="following">
                  Following ({following.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="followers">
                <ScrollArea className="h-[400px] pr-4">
                  <UserList users={followers} />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="following">
                <ScrollArea className="h-[400px] pr-4">
                  <UserList users={following} />
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}

          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Added members can use the invite link to request access</li>
              <li>You'll receive access requests in the Approvals section</li>
              <li>Approve requests to grant them inventory access</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
