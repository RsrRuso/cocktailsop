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
import { Users, Plus, Settings, Trash2, UserPlus, Shield, Crown, User as UserIcon, Search, Mail, Send, Copy, Link, QrCode, MoreVertical, XCircle, ChevronRight } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { InviteTeamMemberDialogV2 } from "@/components/InviteTeamMemberDialogV2";

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

const TeamManagement = () => {
  const { user } = useAuth();
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
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const [mobileTeamView, setMobileTeamView] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user]);

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

  const handleDeleteTeam = async (teamId: string) => {
    try {
      // First delete all team members
      const { error: membersError } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId);

      if (membersError) throw membersError;

      // Delete team invitations
      await supabase
        .from("team_invitations")
        .delete()
        .eq("team_id", teamId);

      // Delete the team
      const { error: teamError } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId);

      if (teamError) throw teamError;

      toast.success("Team deleted successfully!");
      setDeleteTeamId(null);
      
      if (selectedTeam?.id === teamId) {
        setSelectedTeam(null);
        setMobileTeamView(false);
      }
      
      fetchTeams();
    } catch (error: any) {
      console.error("Delete team error:", error);
      toast.error("Failed to delete team");
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

  const handleSelectTeam = (team: Team) => {
    setSelectedTeam(team);
    setMobileTeamView(true);
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
      
      <div className="container mx-auto p-3 sm:p-4 pt-16 sm:pt-20 pb-24 max-w-7xl">
        {/* Header - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Team Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your teams and members</p>
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] sm:max-w-lg">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Teams List - Hide on mobile when viewing team details */}
          <Card className={`lg:col-span-1 ${mobileTeamView ? 'hidden lg:block' : ''}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" />
                Teams
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <ScrollArea className="h-[calc(100vh-280px)] sm:h-[600px]">
                <div className="space-y-2">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                        selectedTeam?.id === team.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div 
                          className="flex-1 min-w-0"
                          onClick={() => handleSelectTeam(team)}
                        >
                          <div className="font-medium truncate">{team.name}</div>
                          {team.description && (
                            <div className="text-sm opacity-80 truncate">
                              {team.description}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <ChevronRight className="w-4 h-4 lg:hidden opacity-50" />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className={`h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity ${
                                  selectedTeam?.id === team.id ? 'text-primary-foreground hover:bg-primary-foreground/20' : ''
                                }`}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTeamId(team.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Team
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
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

          {/* Delete Team Confirmation */}
          <AlertDialog open={!!deleteTeamId} onOpenChange={(open) => !open && setDeleteTeamId(null)}>
            <AlertDialogContent className="mx-4 max-w-[calc(100vw-2rem)] sm:max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Team?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the team and remove all members. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteTeamId && handleDeleteTeam(deleteTeamId)}
                >
                  Delete Team
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Team Members - Show on mobile only when team selected */}
          {selectedTeam && (
            <Card className={`lg:col-span-2 ${!mobileTeamView ? 'hidden lg:block' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1">
                    {/* Back button for mobile */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="lg:hidden mb-2 -ml-2 text-muted-foreground"
                      onClick={() => setMobileTeamView(false)}
                    >
                      <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
                      Back to Teams
                    </Button>
                    <CardTitle className="text-xl sm:text-2xl">{selectedTeam.name}</CardTitle>
                    <CardDescription className="mt-1 text-sm">{selectedTeam.description || "No description"}</CardDescription>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        <Users className="w-3 h-3 mr-1" />
                        {teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}
                      </Badge>
                      <Badge variant="secondary" className="text-xs sm:text-sm">
                        Created {format(new Date(selectedTeam.created_at), "MMM dd, yyyy")}
                      </Badge>
                    </div>
                  </div>
                  <Button className="w-full sm:w-auto" onClick={() => setInviteDialogOpen(true)}>
                    <Mail className="w-4 h-4 mr-2" />
                    Invite Member
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <ScrollArea className="h-[calc(100vh-350px)] sm:h-[600px]">
                  <div className="space-y-3">
                    {teamMembers.map((member) => (
                      <Card key={member.id} className="border-2 hover:border-primary/50 transition-colors">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                            <div className="flex items-center gap-3 sm:gap-4 flex-1">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-semibold text-base sm:text-lg shrink-0">
                                {member.profiles.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="font-semibold text-base sm:text-lg truncate">{member.profiles.full_name}</div>
                                  {getRoleIcon(member.role)}
                                </div>
                                <div className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">
                                  @{member.profiles.username}
                                </div>
                                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                  <Badge variant={getRoleBadgeVariant(member.role)} className="font-medium text-xs">
                                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">{member.title}</Badge>
                                  <span className="text-xs text-muted-foreground hidden sm:inline">
                                    Joined {format(new Date(member.joined_at), "MMM dd")}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-row sm:flex-col gap-2 sm:gap-2 mt-2 sm:mt-0">
                              <Select
                                value={member.role}
                                onValueChange={(value) =>
                                  handleUpdateMemberRole(member.id, value)
                                }
                              >
                                <SelectTrigger className="w-[110px] sm:w-[140px] h-9">
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
                                className="h-9"
                                onClick={() => handleRemoveMember(member.id)}
                              >
                                <Trash2 className="w-3 h-3 sm:mr-1" />
                                <span className="hidden sm:inline">Remove</span>
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
                       <Separator className="my-4 sm:my-6" />
                       <div className="space-y-3">
                         <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                           <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                           Pending Invitations ({pendingInvitations.length})
                         </h3>
                           {pendingInvitations.map((invitation) => {
                             const invitationLink = `${window.location.origin}/team-invitation?token=${invitation.id}`;
                             return (
                               <Card key={invitation.id} className="border-2 border-dashed">
                                 <CardContent className="p-3 sm:p-4">
                                   <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                     <div className="flex-1 flex flex-col gap-3">
                                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                         <div className="flex-1 min-w-0">
                                           <div className="font-medium text-sm sm:text-base truncate">{invitation.invited_email}</div>
                                           <div className="flex flex-wrap items-center gap-2 mt-1">
                                             <Badge variant="outline" className="font-medium text-xs">
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
                                             className="flex-1 sm:flex-none h-8"
                                             onClick={() => handleResendInvitation(invitation.id, invitation.invited_email)}
                                           >
                                             <Send className="w-3 h-3 sm:mr-1" />
                                             <span className="hidden sm:inline">Resend</span>
                                           </Button>
                                           <Button
                                             size="sm"
                                             variant="secondary"
                                             className="flex-1 sm:flex-none h-8"
                                             onClick={() => handleCopyInvitationLink(invitation.id, invitation.invited_email)}
                                           >
                                             <Copy className="w-3 h-3 sm:mr-1" />
                                             <span className="hidden sm:inline">Copy Link</span>
                                           </Button>
                                         </div>
                                       </div>
                                       <div className="bg-muted/50 rounded-md p-2 flex items-center gap-2">
                                         <Link className="w-3 h-3 text-muted-foreground shrink-0" />
                                         <code className="text-xs flex-1 truncate text-muted-foreground">
                                           {invitationLink}
                                         </code>
                                       </div>
                                     </div>
                                     <div className="hidden sm:flex flex-col items-center gap-2 p-3 bg-background rounded-md border shrink-0">
                                       <QrCode className="w-4 h-4 text-muted-foreground" />
                                       <QRCodeSVG 
                                         value={invitationLink}
                                         size={100}
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
        <InviteTeamMemberDialogV2
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          teamId={selectedTeam.id}
          teamName={selectedTeam.name}
          existingMemberIds={teamMembers.map(m => m.user_id)}
          onSuccess={() => {
            fetchTeamMembers();
            window.dispatchEvent(new CustomEvent('invitationSent'));
          }}
        />
      )}
    </div>
  );
};

export default TeamManagement;