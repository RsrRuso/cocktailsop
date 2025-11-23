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

      console.log("Attempting to add members:", members);

      const { data, error } = await supabase
        .from("workspace_members")
        .insert(members)
        .select();

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      console.log("Successfully added members:", data);
      toast.success(`Added ${selectedUsers.size} member(s) to workspace`);
      setSelectedUsers(new Set());
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Invite error:", error);
      toast.error(error.message || "Failed to add members. Please check console for details.");
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

        <Tabs defaultValue="connections" className="flex-1 flex flex-col min-h-0">
          <div className="px-4 sm:px-6 pt-4 shrink-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="connections" className="gap-1.5 text-xs sm:text-sm">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">From Connections</span>
                <span className="sm:hidden">Connections</span>
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-1.5 text-xs sm:text-sm">
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">By Email</span>
                <span className="sm:hidden">Email</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="connections" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=active]:flex">
            {/* Controls Section */}
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
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedUsers.size > 0 && (
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {selectedUsers.size} user(s) selected
                </div>
              )}
            </div>

            {/* Lists Section - Scrollable */}
            <div className="flex-1 min-h-0 px-4 sm:px-6 py-3">
              <Tabs defaultValue="following" className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2 shrink-0 mb-3">
                  <TabsTrigger value="following" className="text-xs sm:text-sm">
                    Following ({following.length})
                  </TabsTrigger>
                  <TabsTrigger value="followers" className="text-xs sm:text-sm">
                    Followers ({followers.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="following" className="flex-1 min-h-0 mt-0 data-[state=active]:block">
                  <ScrollArea className="h-full">
                    <div className="pr-3">
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

                <TabsContent value="followers" className="flex-1 min-h-0 mt-0 data-[state=active]:block">
                  <ScrollArea className="h-full">
                    <div className="pr-3">
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
              </Tabs>
            </div>

            {/* Fixed Buttons at Bottom */}
            <div className="px-4 sm:px-6 py-3 border-t shrink-0 bg-background">
              <div className="flex justify-end gap-2">
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
          </TabsContent>

          <TabsContent value="email" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=active]:flex">
            <div className="flex-1 min-h-0 overflow-auto px-4 sm:px-6 py-4">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs sm:text-sm">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="h-9 sm:h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="role" className="text-xs sm:text-sm">Role</Label>
                  <Select
                    value={role}
                    onValueChange={(value: "member" | "admin") => setRole(value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="role" className="h-9 sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {role === "member"
                      ? "Can view and manage stores"
                      : "Can manage workspace and invite members"}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-3 border-t shrink-0 bg-background">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleInviteByEmail} 
                  disabled={isLoading}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                >
                  <Mail className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {isLoading ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
