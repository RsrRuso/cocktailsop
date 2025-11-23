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
import { UserPlus, Users } from "lucide-react";
import OptimizedAvatar from "./OptimizedAvatar";

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface InviteTeamMemberDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  existingMemberIds: string[];
  onSuccess?: () => void;
}

export const InviteTeamMemberDialogV2 = ({
  open,
  onOpenChange,
  teamId,
  teamName,
  existingMemberIds,
  onSuccess,
}: InviteTeamMemberDialogV2Props) => {
  const [role, setRole] = useState<"member" | "admin">("member");
  const [title, setTitle] = useState("Member");
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
      setRole("member");
      setTitle("Member");
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

      // Filter out existing team members
      const existingIds = new Set(existingMemberIds);

      const followersList = followersData
        ?.map((f: any) => f.profiles)
        .filter((p: Profile) => p && !existingIds.has(p.id)) || [];

      const followingList = followingData
        ?.map((f: any) => f.profiles)
        .filter((p: Profile) => p && !existingIds.has(p.id)) || [];

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
      const members = Array.from(selectedUsers).map(userId => ({
        team_id: teamId,
        user_id: userId,
        role: role,
        title: title,
      }));

      const { error } = await supabase
        .from("team_members")
        .insert(members);

      if (error) throw error;

      toast.success(`Added ${selectedUsers.size} member(s) to ${teamName}`);
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add Members to {teamName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Search connections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(value: "member" | "admin") => setRole(value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Developer"
                disabled={isLoading}
              />
            </div>
          </div>

          {selectedUsers.size > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedUsers.size} user(s) selected
            </div>
          )}

          <Tabs defaultValue="following" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="following" className="gap-2">
                <Users className="w-4 h-4" />
                Following ({following.length})
              </TabsTrigger>
              <TabsTrigger value="followers" className="gap-2">
                <Users className="w-4 h-4" />
                Followers ({followers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="following" className="flex-1 min-h-0 mt-2">
              <ScrollArea className="h-[300px] pr-4">
                {loadingConnections ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading...
                  </div>
                ) : (
                  renderProfileList(following)
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="followers" className="flex-1 min-h-0 mt-2">
              <ScrollArea className="h-[300px] pr-4">
                {loadingConnections ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading...
                  </div>
                ) : (
                  renderProfileList(followers)
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInviteSelected}
              disabled={isLoading || selectedUsers.size === 0}
            >
              {isLoading ? "Adding..." : `Add ${selectedUsers.size || ""} Member(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
