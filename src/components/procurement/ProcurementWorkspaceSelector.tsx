import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProcurementWorkspace } from "@/hooks/useProcurementWorkspace";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  Users, Plus, Settings, Trash2, UserPlus, Crown, X, Building2
} from "lucide-react";
import { InviteProcurementMemberDialog } from "./InviteProcurementMemberDialog";

interface Props {
  selectedWorkspaceId: string | null;
  onSelectWorkspace: (workspaceId: string | null) => void;
}

export const ProcurementWorkspaceSelector = ({ selectedWorkspaceId, onSelectWorkspace }: Props) => {
  const { user } = useAuth();
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
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("");

  const selectedWorkspace = workspaces?.find(w => w.id === selectedWorkspaceId);
  const { data: members, refetch: refetchMembers } = useWorkspaceMembers(selectedWorkspaceId);

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
              
              <ScrollArea className="h-[200px]">
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
                  
                  {/* Members */}
                  {members?.map((member) => (
                    <Card key={member.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.profile?.avatar_url || undefined} />
                            <AvatarFallback>
                              {member.profile?.full_name?.[0] || member.profile?.username?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {member.profile?.full_name || member.profile?.username || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {member.role === 'admin' ? 'Admin' : 'Member'}
                            </p>
                          </div>
                        </div>
                        {isOwner && member.user_id !== user?.id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveMember(member.user_id)}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
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
