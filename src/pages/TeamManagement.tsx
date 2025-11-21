import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Users, Plus, Settings, Trash2, UserPlus, Shield, Crown, User as UserIcon, Search, Mail, Send, Copy, Link, QrCode, Building2 } from "lucide-react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { InviteTeamMemberDialog } from "@/components/InviteTeamMemberDialog";

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

interface PendingInvitation {
  id: string;
  invited_email: string;
  role: string;
  created_at: string;
  status: string;
}

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

interface WorkspaceMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

const TeamManagement = () => {
  const { user } = useAuth();
  const { currentWorkspace, workspaces, switchWorkspace, createWorkspace, refreshWorkspaces } = useWorkspace();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [searchUsername, setSearchUsername] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [memberRole, setMemberRole] = useState("member");
  const [memberTitle, setMemberTitle] = useState("Member");
  
  // Workspace-related states
  const [createWorkspaceDialog, setCreateWorkspaceDialog] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [inviteWorkspaceMemberDialog, setInviteWorkspaceMemberDialog] = useState(false);
  const [workspaceInviteEmail, setWorkspaceInviteEmail] = useState("");
  const [followers, setFollowers] = useState<Profile[]>([]);

  useEffect(() => {
    if (user) {
      fetchTeams();
      fetchFollowers();
    }
  }, [user]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchWorkspaceMembers();
    }
  }, [currentWorkspace]);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamMembers();
      fetchPendingInvitations();
    }
  }, [selectedTeam]);

  useEffect(() => {
    // Listen for invitation sent event to refresh the list
    const handleInvitationSent = () => {
      fetchPendingInvitations();
    };
    
    window.addEventListener('invitationSent', handleInvitationSent);
    return () => window.removeEventListener('invitationSent', handleInvitationSent);
  }, [selectedTeam]);

  const fetchFollowers = async () => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id, profiles!follows_following_id_fkey(*)')
        .eq('follower_id', user?.id);

      if (error) throw error;
      
      const followerProfiles = data?.map(f => f.profiles).filter(Boolean) as Profile[];
      setFollowers(followerProfiles);
    } catch (error) {
      console.error('Error fetching followers:', error);
    }
  };

  const fetchWorkspaceMembers = async () => {
    if (!currentWorkspace) return;
    
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('workspace_id', currentWorkspace.id);

      if (error) throw error;

      const formattedMembers: WorkspaceMember[] = data?.map(m => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at || '',
        user: {
          id: (m.profiles as any)?.id || '',
          username: (m.profiles as any)?.username || '',
          full_name: (m.profiles as any)?.full_name || '',
          avatar_url: (m.profiles as any)?.avatar_url || null,
        }
      })) || [];

      setWorkspaceMembers(formattedMembers);
    } catch (error) {
      console.error('Error fetching workspace members:', error);
    }
  };

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

  const fetchPendingInvitations = async () => {
    if (!selectedTeam) return;

    try {
      const { data, error } = await supabase
        .from("team_invitations")
        .select("id, invited_email, role, created_at, status")
        .eq("team_id", selectedTeam.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPendingInvitations(data || []);
    } catch (error: any) {
      console.error("Failed to load pending invitations:", error);
    }
  };

  const handleResendInvitation = async (invitationId: string, email: string) => {
    try {
      const { error } = await supabase.functions.invoke("send-team-invitation", {
        body: { invitationId },
      });

      if (error) {
        console.error("Resend error:", error);
        toast.error("Failed to resend invitation");
      } else {
        toast.success(`Invitation resent to ${email}`);
      }
    } catch (error: any) {
      console.error("Resend error:", error);
      toast.error("Failed to resend invitation");
    }
  };

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) {
      toast.error("Please enter a workspace name");
      return;
    }

    try {
      const workspace = await createWorkspace(workspaceName, workspaceDescription);
      if (workspace) {
        toast.success("Workspace created successfully");
        setCreateWorkspaceDialog(false);
        setWorkspaceName("");
        setWorkspaceDescription("");
        await refreshWorkspaces();
        switchWorkspace(workspace.id);
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
      toast.error("Failed to create workspace");
    }
  };

  const handleInviteToWorkspace = async () => {
    if (!currentWorkspace) {
      toast.error("Please select a workspace first");
      return;
    }

    if (!workspaceInviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    try {
      // Check if user exists
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', workspaceInviteEmail)
        .single();

      if (!profiles) {
        toast.error("User not found");
        return;
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', currentWorkspace.id)
        .eq('user_id', profiles.id)
        .single();

      if (existingMember) {
        toast.error("User is already a member of this workspace");
        return;
      }

      // Add as member
      const { error } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: currentWorkspace.id,
          user_id: profiles.id,
          role: 'member'
        });

      if (error) throw error;

      toast.success("Member added to workspace successfully");
      setInviteWorkspaceMemberDialog(false);
      setWorkspaceInviteEmail("");
      fetchWorkspaceMembers();
    } catch (error) {
      console.error('Error inviting to workspace:', error);
      toast.error("Failed to add member to workspace");
    }
  };

  const handleAddFollowerToWorkspace = async (followerId: string) => {
    if (!currentWorkspace) {
      toast.error("Please select a workspace first");
      return;
    }

    try {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', currentWorkspace.id)
        .eq('user_id', followerId)
        .single();

      if (existingMember) {
        toast.error("User is already a member of this workspace");
        return;
      }

      const { error } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: currentWorkspace.id,
          user_id: followerId,
          role: 'member'
        });

      if (error) throw error;

      toast.success("Follower added to workspace successfully");
      fetchWorkspaceMembers();
    } catch (error) {
      console.error('Error adding follower to workspace:', error);
      toast.error("Failed to add follower to workspace");
    }
  };

  const handleRemoveFromWorkspace = async (memberId: string) => {
    if (!currentWorkspace) return;

    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success("Member removed from workspace");
      fetchWorkspaceMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error("Failed to remove member");
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast.error("Please enter a team name");
      return;
    }

    try {
      // Get fresh session to ensure we have valid auth token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error("❌ No valid session:", sessionError);
        toast.error("Session expired. Please refresh the page and try again.");
        return;
      }

      console.log("✅ Valid session found for user:", session.user.id);
      
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: teamName.trim(),
          description: teamDescription?.trim() || null,
          // created_by is auto-set by database default + trigger
        })
        .select()
        .single();

      if (teamError) {
        console.error("❌ Team creation error:", teamError);
        
        // If it's an RLS error, try to refresh the session
        if (teamError.code === '42501') {
          toast.error("Authentication issue detected. Refreshing your session...");
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            toast.error("Please log out and log back in to continue.");
          } else {
            toast.success("Session refreshed! Please try creating the team again.");
          }
          return;
        }
        
        toast.error(`Failed to create team: ${teamError.message}`);
        return;
      }

      console.log("✅ Team created:", teamData);

      // Add creator as owner
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: teamData.id,
          user_id: session.user.id,
          role: "owner",
          title: "Team Lead",
        });

      if (memberError) {
        console.error("❌ Failed to add as owner:", memberError);
        // Team was created but couldn't add owner - still show success
        toast.success("Team created! Please refresh to see it.");
      } else {
        console.log("✅ Successfully added as team owner");
        toast.success("Team created successfully!");
      }

      setCreateDialogOpen(false);
      setTeamName("");
      setTeamDescription("");
      fetchTeams();
    } catch (error: any) {
      console.error("❌ Unexpected error:", error);
      toast.error(error.message || "An unexpected error occurred");
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

  const handleCopyInvitationLink = (invitationId: string, email: string) => {
    const invitationLink = `${window.location.origin}/team-invitation?token=${invitationId}`;
    navigator.clipboard.writeText(invitationLink).then(() => {
      toast.success(`Invitation link copied for ${email}!`);
    }).catch(() => {
      toast.error("Failed to copy link");
    });
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
        {/* Header with Workspace Selector */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Team & Workspace Management</h1>
            <p className="text-muted-foreground">Manage your workspaces, teams and members</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={currentWorkspace?.id || 'personal'} onValueChange={switchWorkspace}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select workspace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                {workspaces.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={createWorkspaceDialog} onOpenChange={setCreateWorkspaceDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Building2 className="w-4 h-4 mr-2" />
                  New Workspace
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Workspace</DialogTitle>
                  <DialogDescription>Create a workspace to organize your team and inventory</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Workspace Name</Label>
                    <Input
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      placeholder="e.g., Main Bar"
                    />
                  </div>
                  <div>
                    <Label>Description (Optional)</Label>
                    <Textarea
                      value={workspaceDescription}
                      onChange={(e) => setWorkspaceDescription(e.target.value)}
                      placeholder="Describe your workspace..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateWorkspaceDialog(false)}>Cancel</Button>
                  <Button onClick={handleCreateWorkspace}>Create Workspace</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Workspace Members Section */}
        {currentWorkspace && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    {currentWorkspace.name} Members
                  </CardTitle>
                  <CardDescription>Manage members in this workspace</CardDescription>
                </div>
                <Dialog open={inviteWorkspaceMemberDialog} onOpenChange={setInviteWorkspaceMemberDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Mail className="w-4 h-4 mr-2" />
                      Invite by Email
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Member to Workspace</DialogTitle>
                      <DialogDescription>Send an invitation to join {currentWorkspace.name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Email Address</Label>
                        <Input
                          type="email"
                          value={workspaceInviteEmail}
                          onChange={(e) => setWorkspaceInviteEmail(e.target.value)}
                          placeholder="colleague@example.com"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setInviteWorkspaceMemberDialog(false)}>Cancel</Button>
                      <Button onClick={handleInviteToWorkspace}>
                        <Send className="w-4 h-4 mr-2" />
                        Send Invitation
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Followers Section */}
                {followers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Add from Followers
                    </h3>
                    <div className="grid gap-2">
                      {followers
                        .filter(f => !workspaceMembers.some(m => m.user_id === f.id))
                        .map((follower) => (
                          <div key={follower.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={follower.avatar_url || ''} />
                                <AvatarFallback>{follower.full_name?.[0] || follower.username?.[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{follower.full_name || follower.username}</p>
                                <p className="text-xs text-muted-foreground">@{follower.username}</p>
                              </div>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => handleAddFollowerToWorkspace(follower.id)}>
                              <Plus className="w-4 h-4 mr-1" />
                              Add
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Current Members */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Current Members ({workspaceMembers.length})</h3>
                  <div className="space-y-2">
                    {workspaceMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.user.avatar_url || ''} />
                            <AvatarFallback>{member.user.full_name?.[0] || member.user.username?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.user.full_name || member.user.username}</p>
                            <p className="text-sm text-muted-foreground">@{member.user.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                            {member.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                            {member.role}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveFromWorkspace(member.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Team Button */}
        <div className="flex justify-end mb-6">
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
                  <Button size="lg" onClick={() => setInviteDialogOpen(true)}>
                    <Mail className="w-4 h-4 mr-2" />
                    Invite Member
                  </Button>
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
                          Invite members to start collaborating on tasks together
                        </p>
                        <Button onClick={() => setInviteDialogOpen(true)}>
                          <Mail className="w-4 h-4 mr-2" />
                          Send Invitation
                        </Button>
                      </div>
                    )}
                   </div>

                   {/* Pending Invitations Section */}
                   {pendingInvitations.length > 0 && (
                     <>
                       <Separator className="my-6" />
                       <div className="space-y-3">
                         <h3 className="text-lg font-semibold flex items-center gap-2">
                           <Mail className="w-5 h-5" />
                           Pending Invitations ({pendingInvitations.length})
                         </h3>
                           {pendingInvitations.map((invitation) => {
                             const invitationLink = `${window.location.origin}/team-invitation?token=${invitation.id}`;
                             return (
                               <Card key={invitation.id} className="border-2 border-dashed">
                                 <CardContent className="p-4">
                                   <div className="flex gap-4">
                                     <div className="flex-1 flex flex-col gap-3">
                                       <div className="flex items-center justify-between">
                                         <div className="flex-1">
                                           <div className="font-medium">{invitation.invited_email}</div>
                                           <div className="flex items-center gap-2 mt-1">
                                             <Badge variant="outline" className="font-medium">
                                               {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                                             </Badge>
                                             <span className="text-xs text-muted-foreground">
                                               Sent {format(new Date(invitation.created_at), "MMM dd, yyyy")}
                                             </span>
                                           </div>
                                         </div>
                                         <div className="flex gap-2">
                                           <Button
                                             size="sm"
                                             variant="outline"
                                             onClick={() => handleResendInvitation(invitation.id, invitation.invited_email)}
                                           >
                                             <Send className="w-3 h-3 mr-1" />
                                             Resend
                                           </Button>
                                           <Button
                                             size="sm"
                                             variant="secondary"
                                             onClick={() => handleCopyInvitationLink(invitation.id, invitation.invited_email)}
                                           >
                                             <Copy className="w-3 h-3 mr-1" />
                                             Copy Link
                                           </Button>
                                         </div>
                                       </div>
                                       <div className="bg-muted/50 rounded-md p-2 flex items-center gap-2">
                                         <Link className="w-3 h-3 text-muted-foreground" />
                                         <code className="text-xs flex-1 truncate text-muted-foreground">
                                           {invitationLink}
                                         </code>
                                       </div>
                                     </div>
                                     <div className="flex flex-col items-center gap-2 p-3 bg-background rounded-md border">
                                       <QrCode className="w-4 h-4 text-muted-foreground" />
                                       <QRCodeSVG 
                                         value={invitationLink}
                                         size={120}
                                         level="H"
                                         className="rounded"
                                       />
                                       <span className="text-xs text-muted-foreground">Scan to join</span>
                                     </div>
                                   </div>
                                 </CardContent>
                               </Card>
                             );
                           })}
                       </div>
                     </>
                   )}
                 </ScrollArea>
               </CardContent>
             </Card>
           )}
         </div>
       </div>

       <BottomNav />
      
      {selectedTeam && (
        <InviteTeamMemberDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          teamId={selectedTeam.id}
          teamName={selectedTeam.name}
        />
      )}
    </div>
  );
};

export default TeamManagement;