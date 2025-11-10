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
    if (!user || !teamName.trim()) return;

    try {
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: teamName,
          description: teamDescription,
          created_by: user.id,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: teamData.id,
          user_id: user.id,
          role: "owner",
          title: "Team Lead",
        });

      if (memberError) throw memberError;

      toast.success("Team created successfully!");
      setCreateDialogOpen(false);
      setTeamName("");
      setTeamDescription("");
      fetchTeams();
    } catch (error: any) {
      toast.error("Failed to create team");
    }
  };

  const handleSearchUsers = async () => {
    if (!searchUsername.trim()) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .ilike("username", `%${searchUsername}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      toast.error("Failed to search users");
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedTeam) return;

    try {
      const { error } = await supabase
        .from("team_members")
        .insert({
          team_id: selectedTeam.id,
          user_id: userId,
          role: memberRole,
          title: memberTitle,
        });

      if (error) throw error;

      toast.success("Member added successfully!");
      setAddMemberDialogOpen(false);
      setSearchUsername("");
      setSearchResults([]);
      setMemberRole("member");
      setMemberTitle("Member");
      fetchTeamMembers();
    } catch (error: any) {
      toast.error("Failed to add member");
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
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container mx-auto p-4 max-w-7xl">
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
                    <CardTitle>{selectedTeam.name}</CardTitle>
                    <CardDescription>{selectedTeam.description}</CardDescription>
                  </div>
                  <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Team Member</DialogTitle>
                        <DialogDescription>
                          Search for users and add them to the team
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="search-user">Search Username</Label>
                          <div className="flex gap-2">
                            <Input
                              id="search-user"
                              value={searchUsername}
                              onChange={(e) => setSearchUsername(e.target.value)}
                              placeholder="Enter username"
                            />
                            <Button onClick={handleSearchUsers}>
                              <Search className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="member-role">Role</Label>
                          <Select value={memberRole} onValueChange={setMemberRole}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="member-title">Title</Label>
                          <Input
                            id="member-title"
                            value={memberTitle}
                            onChange={(e) => setMemberTitle(e.target.value)}
                            placeholder="e.g., Senior Developer, Manager"
                          />
                        </div>

                        {searchResults.length > 0 && (
                          <div>
                            <Label>Search Results</Label>
                            <ScrollArea className="h-[200px] border rounded-lg p-2">
                              {searchResults.map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center justify-between p-2 hover:bg-muted rounded-lg"
                                >
                                  <div>
                                    <div className="font-medium">{user.full_name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      @{user.username}
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => handleAddMember(user.id)}
                                  >
                                    Add
                                  </Button>
                                </div>
                              ))}
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{member.profiles.full_name}</div>
                            {getRoleIcon(member.role)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            @{member.profiles.username}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={getRoleBadgeVariant(member.role)}>
                              {member.role}
                            </Badge>
                            <Badge variant="outline">{member.title}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(value) =>
                              handleUpdateMemberRole(member.id, value)
                            }
                          >
                            <SelectTrigger className="w-[120px]">
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
                            size="icon"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {teamMembers.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No members yet. Add some to get started!
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