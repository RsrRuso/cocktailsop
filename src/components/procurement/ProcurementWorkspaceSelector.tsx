import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useProcurementWorkspace } from "@/hooks/useProcurementWorkspace";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Users, Plus, Settings, Trash2, UserPlus, Crown, X, Building2, KeyRound, Edit
} from "lucide-react";
import { InviteProcurementMemberDialog } from "./InviteProcurementMemberDialog";

interface ProcurementStaff {
  id: string;
  full_name: string;
  pin_code: string;
  permissions: {
    can_create_po?: boolean;
    can_receive?: boolean;
  };
}

interface Props {
  selectedWorkspaceId: string | null;
  onSelectWorkspace: (workspaceId: string | null) => void;
}

export const ProcurementWorkspaceSelector = ({ selectedWorkspaceId, onSelectWorkspace }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { 
    workspaces, 
    isLoadingWorkspaces, 
    createWorkspace, 
    deleteWorkspace,
    useWorkspaceMembers,
    removeMember
  } = useProcurementWorkspace();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<{ name: string; userId?: string } | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("");
  const [pinFormData, setPinFormData] = useState({
    pin_code: "",
    can_create_po: true,
    can_receive: true
  });

  const selectedWorkspace = workspaces?.find(w => w.id === selectedWorkspaceId);
  const { data: members, refetch: refetchMembers } = useWorkspaceMembers(selectedWorkspaceId);

  // Fetch procurement staff for workspace
  const { data: procurementStaff = [] } = useQuery({
    queryKey: ["procurement-staff", selectedWorkspaceId],
    queryFn: async () => {
      if (!selectedWorkspaceId) return [];
      const { data, error } = await supabase
        .from("procurement_staff")
        .select("*")
        .eq("workspace_id", selectedWorkspaceId);
      if (error) throw error;
      return data as ProcurementStaff[];
    },
    enabled: !!selectedWorkspaceId && showManageDialog
  });

  // Get staff PIN info for a member
  const getStaffInfo = (memberName: string) => {
    return procurementStaff.find(s => s.full_name === memberName);
  };

  // Add/Update staff PIN mutation
  const upsertStaffMutation = useMutation({
    mutationFn: async ({ name, data }: { name: string; data: typeof pinFormData }) => {
      const existingStaff = getStaffInfo(name);
      if (existingStaff) {
        const { error } = await supabase
          .from("procurement_staff")
          .update({
            pin_code: data.pin_code,
            permissions: { can_create_po: data.can_create_po, can_receive: data.can_receive }
          })
          .eq("id", existingStaff.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("procurement_staff").insert({
          workspace_id: selectedWorkspaceId,
          full_name: name,
          role: "staff",
          pin_code: data.pin_code,
          permissions: { can_create_po: data.can_create_po, can_receive: data.can_receive },
          is_active: true
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement-staff", selectedWorkspaceId] });
      toast.success("PIN access updated");
      setShowPinDialog(false);
      setEditingMember(null);
      setPinFormData({ pin_code: "", can_create_po: true, can_receive: true });
    },
    onError: () => toast.error("Failed to update PIN access")
  });

  const handleSetupPin = (memberName: string) => {
    const existingStaff = getStaffInfo(memberName);
    setEditingMember({ name: memberName });
    setPinFormData({
      pin_code: existingStaff?.pin_code || "",
      can_create_po: existingStaff?.permissions?.can_create_po ?? true,
      can_receive: existingStaff?.permissions?.can_receive ?? true
    });
    setShowPinDialog(true);
  };

  const handleSavePin = () => {
    if (!editingMember?.name) return;
    if (pinFormData.pin_code.length !== 4 || !/^\d+$/.test(pinFormData.pin_code)) {
      toast.error("PIN must be 4 digits");
      return;
    }
    upsertStaffMutation.mutate({ name: editingMember.name, data: pinFormData });
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      toast.error("Please enter a workspace name");
      return;
    }
    
    await createWorkspace.mutateAsync({
      name: newWorkspaceName.trim(),
      description: newWorkspaceDescription.trim() || undefined
    });
    
    setNewWorkspaceName("");
    setNewWorkspaceDescription("");
    setShowCreateDialog(false);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedWorkspaceId) return;
    
    await removeMember.mutateAsync({
      workspaceId: selectedWorkspaceId,
      userId
    });
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (confirm("Are you sure you want to delete this workspace?")) {
      await deleteWorkspace.mutateAsync(id);
      if (selectedWorkspaceId === id) {
        onSelectWorkspace(null);
      }
    }
  };

  const isOwner = selectedWorkspace?.owner_id === user?.id;

  return (
    <div className="space-y-3">
      {/* Workspace Selector */}
      <div className="flex items-center gap-2">
        <Select 
          value={selectedWorkspaceId || "personal"} 
          onValueChange={(v) => onSelectWorkspace(v === "personal" ? null : v)}
        >
          <SelectTrigger className="flex-1">
            <div className="flex items-center gap-2">
              {selectedWorkspace ? (
                <>
                  <Users className="h-4 w-4 text-primary" />
                  <span>{selectedWorkspace.name}</span>
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4" />
                  <span>Personal</span>
                </>
              )}
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="personal">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Personal
              </div>
            </SelectItem>
            {workspaces?.map((workspace) => (
              <SelectItem key={workspace.id} value={workspace.id}>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  {workspace.name}
                  {workspace.owner_id === user?.id && (
                    <Crown className="h-3 w-3 text-yellow-500" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button variant="outline" size="icon" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
        </Button>
        
        {selectedWorkspaceId && (
          <Button variant="outline" size="icon" onClick={() => setShowManageDialog(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Active Collaborators */}
      {selectedWorkspaceId && members && members.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Team:</span>
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((member) => (
              <Avatar key={member.id} className="h-6 w-6 border-2 border-background">
                <AvatarImage src={member.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {member.profile?.full_name?.[0] || member.profile?.username?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
            ))}
            {members.length > 5 && (
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] border-2 border-background">
                +{members.length - 5}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Workspace Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Create Procurement Workspace
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Workspace Name</Label>
              <Input
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="e.g., Attiko Procurement"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={newWorkspaceDescription}
                onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                placeholder="Team procurement workspace"
              />
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleCreateWorkspace}
              disabled={createWorkspace.isPending}
            >
              {createWorkspace.isPending ? "Creating..." : "Create Workspace"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Workspace Dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Manage: {selectedWorkspace?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Members List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Members ({members?.length || 0})</Label>
                {isOwner && (
                  <Button size="sm" variant="outline" onClick={() => setShowInviteDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add from Followers
                  </Button>
                )}
              </div>
              
              <ScrollArea className="h-[280px]">
                <div className="space-y-2">
                  {/* Owner */}
                  {selectedWorkspace && (
                    <Card className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>O</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">Owner</p>
                            <p className="text-xs text-muted-foreground">Workspace creator</p>
                          </div>
                        </div>
                        <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                          <Crown className="h-3 w-3 mr-1" />
                          Owner
                        </Badge>
                      </div>
                    </Card>
                  )}
                  
                  {/* Members with PIN info */}
                  {members?.map((member) => {
                    const memberName = member.profile?.full_name || member.profile?.username || 'Unknown';
                    const staffInfo = getStaffInfo(memberName);
                    return (
                      <Card key={member.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={member.profile?.avatar_url || undefined} />
                              <AvatarFallback>
                                {memberName[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{memberName}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                {staffInfo ? (
                                  <>
                                    <Badge variant="outline" className="text-[10px] h-5">
                                      <KeyRound className="w-2.5 h-2.5 mr-1" />
                                      {staffInfo.pin_code}
                                    </Badge>
                                    {staffInfo.permissions?.can_create_po && (
                                      <Badge variant="secondary" className="text-[10px] h-5">PO</Badge>
                                    )}
                                    {staffInfo.permissions?.can_receive && (
                                      <Badge variant="secondary" className="text-[10px] h-5">Receive</Badge>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">No PIN set</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleSetupPin(memberName)}
                            >
                              {staffInfo ? <Edit className="h-3.5 w-3.5" /> : <KeyRound className="h-3.5 w-3.5" />}
                            </Button>
                            {isOwner && member.user_id !== user?.id && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => handleRemoveMember(member.user_id)}
                              >
                                <X className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Delete Workspace */}
            {isOwner && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => handleDeleteWorkspace(selectedWorkspaceId!)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Workspace
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* PIN Setup Dialog */}
      <Dialog open={showPinDialog} onOpenChange={(o) => {
        if (!o) {
          setShowPinDialog(false);
          setEditingMember(null);
          setPinFormData({ pin_code: "", can_create_po: true, can_receive: true });
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              {getStaffInfo(editingMember?.name || '') ? 'Edit' : 'Setup'} PIN Access
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Setting PIN for:</p>
              <p className="font-medium">{editingMember?.name}</p>
            </div>

            <div>
              <Label>4-Digit PIN Code</Label>
              <Input
                value={pinFormData.pin_code}
                onChange={(e) => setPinFormData({ ...pinFormData, pin_code: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="0000"
                maxLength={4}
                className="text-center text-2xl tracking-widest"
              />
            </div>

            <div className="space-y-3">
              <Label>Permissions</Label>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Can Create Purchase Orders</span>
                <Switch
                  checked={pinFormData.can_create_po}
                  onCheckedChange={(c) => setPinFormData({ ...pinFormData, can_create_po: c })}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Can Receive Items</span>
                <Switch
                  checked={pinFormData.can_receive}
                  onCheckedChange={(c) => setPinFormData({ ...pinFormData, can_receive: c })}
                />
              </div>
            </div>

            <Button onClick={handleSavePin} className="w-full" disabled={upsertStaffMutation.isPending}>
              {upsertStaffMutation.isPending ? "Saving..." : "Save PIN Access"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Members from Followers/Following Dialog */}
      {selectedWorkspaceId && selectedWorkspace && (
        <InviteProcurementMemberDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          workspaceId={selectedWorkspaceId}
          workspaceName={selectedWorkspace.name}
          onSuccess={() => refetchMembers()}
        />
      )}
    </div>
  );
};
