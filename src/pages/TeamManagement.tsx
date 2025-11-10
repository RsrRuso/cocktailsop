import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Users, Plus, Settings, Trash2, UserPlus, Shield, Crown, User as UserIcon, Search } from "lucide-react";
import { format } from "date-fns";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

interface Team {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  title: string;
  workload_capacity: number;
  joined_at: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

const TeamManagement = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [searchUsername, setSearchUsername] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [memberRole, setMemberRole] = useState("member");
  const [memberTitle, setMemberTitle] = useState("Member");

  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamMembers();
    }
  }, [selectedTeam]);

  const fetchTeams = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTeams(data || []);
      if (data && data.length > 0 && !selectedTeam) {
        setSelectedTeam(data[0]);
      }
    } catch (error: any) {
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    if (!selectedTeam) return;

    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_id", selectedTeam.id)
        .order("joined_at", { ascending: true });

      if (error) throw error;
      
      // Fetch profiles for all members
      if (data && data.length > 0) {
        const userIds = data.map(m => m.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        // Combine the data
        const membersWithProfiles = data.map(member => ({
          ...member,
          profiles: profilesData?.find(p => p.id === member.user_id) || {
            username: "unknown",
            full_name: "Unknown User",
            avatar_url: null
          }
        }));

        setTeamMembers(membersWithProfiles);
      } else {
        setTeamMembers([]);
      }
    } catch (error: any) {
      toast.error("Failed to load team members");
    }
  };

  const handleCreateTeam = async () => {
    if (!user) {
      toast.error("You must be logged in to create a team");
      return;
    }
    
    if (!teamName.trim()) {
      toast.error("Please enter a team name");
      return;
    }

    try {
      console.log("Creating team with user:", user.id);
      
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: teamName,
          description: teamDescription,
          created_by: user.id,
        })
        .select()
        .single();

      if (teamError) {
        console.error("Team creation error:", teamError);
        throw teamError;
      }

      console.log("Team created successfully:", teamData);

      // Add creator as owner
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: teamData.id,
          user_id: user.id,
          role: "owner",
          title: "Team Lead",
        });

      if (memberError) {
        console.error("Member addition error:", memberError);
        throw memberError;
      }

      toast.success("Team created successfully!");
      setCreateDialogOpen(false);
      setTeamName("");
      setTeamDescription("");
      fetchTeams();
    } catch (error: any) {
      console.error("Failed to create team:", error);
      toast.error(error.message || "Failed to create team. Please check the console for details.");
    }
  };

  const handleSearchUsers = async () => {
    if (!searchUsername.trim()) {
      toast.error("Please enter a username to search");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .ilike("username", `%${searchUsername}%`)
        .limit(10);

      if (error) throw error;
      
      // Filter out users already in the team
      const existingMemberIds = teamMembers.map(m => m.user_id);
      const filteredResults = (data || []).filter(u => !existingMemberIds.includes(u.id));
      
      setSearchResults(filteredResults);
      
      if (filteredResults.length === 0) {
        toast.info("No users found or all users are already team members");
      }
    } catch (error: any) {
      console.error("Search error:", error);
      toast.error("Failed to search users");
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedTeam) {
      toast.error("No team selected");
      return;
    }

    try {
      const { error } = await supabase
        .from("team_members")
        .insert({
          team_id: selectedTeam.id,
          user_id: userId,
          role: memberRole,
          title: memberTitle,
        });

      if (error) {
        console.error("Add member error:", error);
        throw error;
      }

      toast.success("Member added successfully!");
      setAddMemberDialogOpen(false);
      setSearchUsername("");
      setSearchResults([]);
      setMemberRole("member");
      setMemberTitle("Member");
      fetchTeamMembers();
    } catch (error: any) {
      console.error("Failed to add member:", error);
      toast.error(error.message || "Failed to add member");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Member removed successfully!");
      fetchTeamMembers();
    } catch (error: any) {
      toast.error("Failed to remove member");
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Member role updated!");
      fetchTeamMembers();
    } catch (error: any) {
      toast.error("Failed to update role");
    }
  };

  const handleUpdateMemberTitle = async (memberId: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ title: newTitle })
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Member title updated!");
      fetchTeamMembers();
    } catch (error: any) {
      toast.error("Failed to update title");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case "admin":
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <UserIcon className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading teams...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      
      <div className="container mx-auto p-4 pt-20 pb-24 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Team Management</h1>
            <p className="text-muted-foreground">Manage your teams and members</p>
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>
                  Create a new team to collaborate with others
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="team-name">Team Name</Label>
                  <Input
                    id="team-name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Engineering Team"
                  />
                </div>
                <div>
                  <Label htmlFor="team-description">Description</Label>
                  <Textarea
                    id="team-description"
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    placeholder="What does this team do?"
                  />
                </div>
                <Button onClick={handleCreateTeam} className="w-full">
                  Create Team
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teams List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Teams
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      onClick={() => setSelectedTeam(team)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedTeam?.id === team.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="font-medium">{team.name}</div>
                      {team.description && (
                        <div className="text-sm opacity-80 truncate">
                          {team.description}
                        </div>
                      )}
                    </div>
                  ))}
                  {teams.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No teams yet. Create one to get started!
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Team Members */}
          {selectedTeam && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">{selectedTeam.name}</CardTitle>
                    <CardDescription className="mt-1">{selectedTeam.description || "No description"}</CardDescription>
                    <div className="flex items-center gap-4 mt-3">
                      <Badge variant="outline" className="text-sm">
                        <Users className="w-3 h-3 mr-1" />
                        {teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}
                      </Badge>
                      <Badge variant="secondary" className="text-sm">
                        Created {format(new Date(selectedTeam.created_at), "MMM dd, yyyy")}
                      </Badge>
                    </div>
                  </div>
                  <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add Team Member</DialogTitle>
                        <DialogDescription>
                          Search for users by username and add them to your team with specific roles and titles
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6">
                        {/* Search Section */}
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="search-user" className="text-base font-semibold">
                              Search User
                            </Label>
                            <p className="text-sm text-muted-foreground mb-2">
                              Enter username to find users to add to your team
                            </p>
                            <div className="flex gap-2">
                              <Input
                                id="search-user"
                                value={searchUsername}
                                onChange={(e) => setSearchUsername(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && handleSearchUsers()}
                                placeholder="Enter username (e.g., john_doe)"
                                className="flex-1"
                              />
                              <Button onClick={handleSearchUsers} size="lg">
                                <Search className="w-4 h-4 mr-2" />
                                Search
                              </Button>
                            </div>
                          </div>

                          {searchResults.length > 0 && (
                            <div>
                              <Label className="text-base font-semibold">Search Results</Label>
                              <ScrollArea className="h-[180px] border rounded-lg p-2 mt-2">
                                <div className="space-y-2">
                                  {searchResults.map((user) => (
                                    <div
                                      key={user.id}
                                      className="flex items-center justify-between p-3 hover:bg-muted rounded-lg transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                          {user.avatar_url ? (
                                            <img 
                                              src={user.avatar_url} 
                                              alt={user.full_name}
                                              className="w-10 h-10 rounded-full object-cover"
                                            />
                                          ) : (
                                            <UserIcon className="w-5 h-5 text-primary" />
                                          )}
                                        </div>
                                        <div>
                                          <div className="font-medium">{user.full_name}</div>
                                          <div className="text-sm text-muted-foreground">
                                            @{user.username}
                                          </div>
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        onClick={() => handleAddMember(user.id)}
                                      >
                                        <UserPlus className="w-3 h-3 mr-1" />
                                        Add
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* Role and Title Configuration */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="member-role" className="text-base font-semibold">
                              Member Role
                            </Label>
                            <Select value={memberRole} onValueChange={setMemberRole}>
                              <SelectTrigger id="member-role">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">
                                  <div className="flex items-center gap-2">
                                    <UserIcon className="w-4 h-4" />
                                    <span>Member - Basic access</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    <span>Admin - Full management</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              {memberRole === "admin" 
                                ? "Can manage team and members" 
                                : "Can view and work on tasks"}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="member-title" className="text-base font-semibold">
                              Job Title
                            </Label>
                            <Input
                              id="member-title"
                              value={memberTitle}
                              onChange={(e) => setMemberTitle(e.target.value)}
                              placeholder="e.g., Senior Developer"
                            />
                            <p className="text-xs text-muted-foreground">
                              Their position in the team
                            </p>
                          </div>
                        </div>

                        {/* Info Box */}
                        <div className="bg-muted p-4 rounded-lg">
                          <div className="flex gap-2">
                            <Users className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium mb-1">Current Team Size: {teamMembers.length} members</p>
                              <p className="text-muted-foreground">
                                Search and add users to collaborate on tasks together
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {teamMembers.map((member) => (
                      <Card key={member.id} className="border-2 hover:border-primary/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-semibold text-lg">
                              {member.profiles.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-semibold text-lg">{member.profiles.full_name}</div>
                                {getRoleIcon(member.role)}
                              </div>
                              <div className="text-sm text-muted-foreground mb-2">
                                @{member.profiles.username}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={getRoleBadgeVariant(member.role)} className="font-medium">
                                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                </Badge>
                                <Badge variant="outline">{member.title}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  Joined {format(new Date(member.joined_at), "MMM dd")}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Select
                                value={member.role}
                                onValueChange={(value) =>
                                  handleUpdateMemberRole(member.id, value)
                                }
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="owner">Owner</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveMember(member.id)}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {teamMembers.length === 0 && (
                      <div className="text-center py-12">
                        <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Add members to start collaborating on tasks together
                        </p>
                        <Button onClick={() => setAddMemberDialogOpen(true)}>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Add Your First Member
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default TeamManagement;