import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import OptimizedAvatar from "@/components/OptimizedAvatar";

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface InviteProcurementMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceName: string;
  onSuccess?: () => void;
}

export const InviteProcurementMemberDialog = ({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
  onSuccess,
}: InviteProcurementMemberDialogProps) => {
  const [role, setRole] = useState<"member" | "admin">("member");
  const [isLoading, setIsLoading] = useState(false);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (open) {
      fetchConnections();
    } else {
      setSelectedUsers(new Set());
      setSearchQuery("");
    }
  }, [open]);

  const fetchConnections = async () => {
    setLoadingConnections(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch followers
      const { data: followersData } = await supabase
        .from("follows")
        .select(`
          follower_id,
          profiles!follows_follower_id_fkey(id, username, full_name, avatar_url)
        `)
        .eq("following_id", user.id);

      // Fetch following
      const { data: followingData } = await supabase
        .from("follows")
        .select(`
          following_id,
          profiles!follows_following_id_fkey(id, username, full_name, avatar_url)
        `)
        .eq("follower_id", user.id);

      // Get existing workspace members to filter them out
      const { data: existingMembers } = await supabase
        .from("procurement_workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId);

      const existingMemberIds = new Set(existingMembers?.map(m => m.user_id) || []);

      // Filter out existing members
      const followersList = followersData
        ?.map((f: any) => f.profiles)
        .filter((p: Profile) => p && !existingMemberIds.has(p.id)) || [];

      const followingList = followingData
        ?.map((f: any) => f.profiles)
        .filter((p: Profile) => p && !existingMemberIds.has(p.id)) || [];

      setFollowers(followersList);
      setFollowing(followingList);
    } catch (error) {
      console.error("Error fetching connections:", error);
      toast.error("Failed to load connections");
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleInviteSelected = async () => {
    if (selectedUsers.size === 0) {
      toast.error("Please select at least one user");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to add members");
        return;
      }

      const members = Array.from(selectedUsers).map(userId => ({
        workspace_id: workspaceId,
        user_id: userId,
        role: role,
        invited_by: user.id,
      }));

      const { error } = await supabase
        .from("procurement_workspace_members")
        .insert(members);

      if (error) throw error;

      toast.success(`Added ${selectedUsers.size} member(s) to workspace`);
      setSelectedUsers(new Set());
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Invite error:", error);
      toast.error(error.message || "Failed to add members");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUsers(newSet);
  };

  const filterProfiles = (profiles: Profile[]) => {
    if (!searchQuery) return profiles;
    const query = searchQuery.toLowerCase();
    return profiles.filter(
      p =>
        p.username?.toLowerCase().includes(query) ||
        p.full_name?.toLowerCase().includes(query)
    );
  };

  const renderProfileList = (profiles: Profile[]) => {
    const filtered = filterProfiles(profiles);

    if (filtered.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? "No matches found" : "No connections yet"}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filtered.map((profile) => (
          <div
            key={profile.id}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => toggleUser(profile.id)}
          >
            <Checkbox
              checked={selectedUsers.has(profile.id)}
              onCheckedChange={() => toggleUser(profile.id)}
            />
            <OptimizedAvatar
              src={profile.avatar_url}
              alt={profile.username}
              className="w-10 h-10"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{profile.username}</p>
              {profile.full_name && (
                <p className="text-sm text-muted-foreground truncate">
                  {profile.full_name}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <UserPlus className="w-5 h-5" />
            Add Members to {workspaceName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-4 sm:px-6 py-3 space-y-3 border-b shrink-0">
            <Input
              placeholder="Search connections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 sm:h-10"
            />

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Role for selected members</Label>
              <Select
                value={role}
                onValueChange={(value: "member" | "admin") => setRole(value)}
                disabled={isLoading}
              >
                <SelectTrigger className="h-9 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member (View & Edit)</SelectItem>
                  <SelectItem value="admin">Admin (Full access)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedUsers.size > 0 && (
              <div className="text-xs sm:text-sm text-muted-foreground">
                {selectedUsers.size} user(s) selected
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={handleInviteSelected}
                disabled={isLoading || selectedUsers.size === 0}
                className="h-9 sm:h-10 text-xs sm:text-sm"
              >
                {isLoading ? "Adding..." : `Add ${selectedUsers.size || ""} Member(s)`}
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden px-4 sm:px-6">
            <Tabs defaultValue="following" className="h-full flex flex-col pt-3">
              <TabsList className="grid w-full grid-cols-2 shrink-0 mb-3">
                <TabsTrigger value="following" className="text-xs sm:text-sm">
                  Following ({following.length})
                </TabsTrigger>
                <TabsTrigger value="followers" className="text-xs sm:text-sm">
                  Followers ({followers.length})
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 min-h-0 overflow-hidden">
                <TabsContent value="following" className="h-full mt-0 data-[state=active]:block">
                  <ScrollArea className="h-[300px] sm:h-[400px]">
                    <div className="pr-3 pb-4">
                      {loadingConnections ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          Loading...
                        </div>
                      ) : (
                        renderProfileList(following)
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="followers" className="h-full mt-0 data-[state=active]:block">
                  <ScrollArea className="h-[300px] sm:h-[400px]">
                    <div className="pr-3 pb-4">
                      {loadingConnections ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          Loading...
                        </div>
                      ) : (
                        renderProfileList(followers)
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
