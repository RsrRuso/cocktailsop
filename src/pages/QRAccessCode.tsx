import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, RefreshCw, TestTube2, ArrowLeft, Users, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

interface WorkspaceMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
}

const QRAccessCode = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace, workspaces, createWorkspace, switchWorkspace, isLoading } = useWorkspace();
  const [qrCodeId, setQrCodeId] = useState(crypto.randomUUID());
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null);

  const selectedWorkspaceId = currentWorkspace?.id || qrCodeId;
  const qrUrl = `https://cocktailsop.com/scan-access/${selectedWorkspaceId}`;
  const qrPath = `/scan-access/${selectedWorkspaceId}`;

  const generateNewCode = () => {
    const newId = crypto.randomUUID();
    setQrCodeId(newId);
    toast.success("New QR code generated");
  };

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      toast.error("Please enter a workspace name");
      return;
    }

    setIsCreating(true);
    try {
      const workspace = await createWorkspace(newWorkspaceName);
      if (workspace) {
        toast.success("Workspace created!");
        setShowCreateDialog(false);
        setNewWorkspaceName("");
      } else {
        toast.error("Failed to create workspace");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const fetchMembers = async () => {
    if (!currentWorkspace) return;
    
    setLoadingMembers(true);
    try {
      // Fetch workspace members
      const { data: membersData, error: membersError } = await supabase
        .from('workspace_members')
        .select('id, user_id, role, joined_at')
        .eq('workspace_id', currentWorkspace.id)
        .order('joined_at', { ascending: true });

      if (membersError) throw membersError;

      // Fetch profiles for all members
      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine data
      const enrichedMembers = membersData?.map(member => ({
        ...member,
        profiles: profilesData?.find(p => p.id === member.user_id)
      })) || [];

      setMembers(enrichedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (currentWorkspace) {
      fetchMembers();
    }
  }, [currentWorkspace]);

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberToRemove.id);

      if (error) throw error;

      toast.success('Member removed from workspace');
      setMembers(members.filter(m => m.id !== memberToRemove.id));
      setMemberToRemove(null);
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleTestScan = () => {
    navigate(qrPath);
  };

  const isOwner = currentWorkspace?.owner_id === user?.id;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading workspaces...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />
      <main className="flex-1 container mx-auto px-4 py-4 pb-20 max-w-2xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Workspace Access QR Code</CardTitle>
            <CardDescription>
              {currentWorkspace 
                ? `Share this QR code to invite people to ${currentWorkspace.name}`
                : "Create or select a workspace to generate a QR code"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Workspace Selection */}
            <div className="space-y-2">
              <Label>Select Workspace</Label>
              <div className="flex gap-2">
                <Select 
                  value={currentWorkspace?.id || ""} 
                  onValueChange={switchWorkspace}
                  disabled={workspaces.length === 0}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((workspace) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">New Workspace</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Workspace</DialogTitle>
                      <DialogDescription>
                        Create a new workspace for team collaboration
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="workspace-name">Workspace Name</Label>
                        <Input
                          id="workspace-name"
                          value={newWorkspaceName}
                          onChange={(e) => setNewWorkspaceName(e.target.value)}
                          placeholder="My Team Workspace"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateWorkspace} disabled={isCreating}>
                        {isCreating ? "Creating..." : "Create"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {currentWorkspace && (
              <>
                {/* QR Code Display */}
                <div className="flex justify-center p-6 bg-muted rounded-lg">
                  <div className="bg-white p-4 rounded-lg">
                    <QRCodeSVG value={qrUrl} size={200} level="H" />
                  </div>
                </div>

                {/* URLs Display */}
                <div className="space-y-2">
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-1">Full URL</p>
                    <p className="text-xs font-mono break-all text-muted-foreground">{qrUrl}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-1">Path</p>
                    <p className="text-xs font-mono break-all text-muted-foreground">{qrPath}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(qrUrl);
                      toast.success("URL copied to clipboard");
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy URL
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      navigator.clipboard.writeText(qrPath);
                      toast.success("Path copied to clipboard");
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Path
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    onClick={handleTestScan}
                  >
                    <TestTube2 className="mr-2 h-4 w-4" />
                    Test Scan
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={generateNewCode}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    New Code
                  </Button>
                </div>
              </>
            )}

            {!currentWorkspace && workspaces.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4">No workspaces yet. Create one to get started!</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  Create First Workspace
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
};

export default QRAccessCode;
