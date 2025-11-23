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
import { Mail, UserPlus, Users } from "lucide-react";
import OptimizedAvatar from "./OptimizedAvatar";

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface InviteWorkspaceMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceName: string;
  onSuccess?: () => void;
}

export const InviteWorkspaceMemberDialog = ({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
  onSuccess,
}: InviteWorkspaceMemberDialogProps) => {
  const [email, setEmail] = useState("");
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
      setEmail("");
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
        .from("workspace_members")
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

  const handleInviteByEmail = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Insert workspace member directly
      const { error } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspaceId,
          user_id: user.id, // Placeholder, will be updated when user accepts
          role: role,
          invited_by: user.id,
        });

      if (error) throw error;

      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Invite error:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setIsLoading(false);
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
      if (!user) return;

      const members = Array.from(selectedUsers).map(userId => ({
        workspace_id: workspaceId,
        user_id: userId,
        role: role,
        invited_by: user.id,
      }));

      const { error } = await supabase
        .from("workspace_members")
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add Members to {workspaceName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="connections" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="connections" className="gap-2">
              <Users className="w-4 h-4" />
              From Connections
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="w-4 h-4" />
              By Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="flex-1 flex flex-col min-h-0 space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Search connections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Role for selected members</Label>
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

            {selectedUsers.size > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedUsers.size} user(s) selected
              </div>
            )}

            <Tabs defaultValue="following" className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="following">
                  Following ({following.length})
                </TabsTrigger>
                <TabsTrigger value="followers">
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
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={role}
                onValueChange={(value: "member" | "admin") => setRole(value)}
                disabled={isLoading}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {role === "member"
                  ? "Can view and manage stores"
                  : "Can manage workspace and invite members"}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleInviteByEmail} disabled={isLoading}>
                <Mail className="mr-2 h-4 w-4" />
                {isLoading ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
