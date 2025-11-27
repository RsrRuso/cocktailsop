import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFifoWorkspace } from "@/hooks/useFifoWorkspace";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Plus, Edit, Trash2, Users, Package } from "lucide-react";
import { toast } from "sonner";

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  member_count?: number;
  store_count?: number;
}

export default function FifoWorkspaceManagement() {
  const { user } = useAuth();
  const { refreshWorkspaces } = useFifoWorkspace();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const fetchWorkspaces = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Fetch owned workspaces
      const { data: ownedWorkspaces, error: ownedError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .eq('workspace_type', 'fifo_inventory')
        .order('created_at', { ascending: false });

      if (ownedError) throw ownedError;

      // Fetch member workspaces
      const { data: memberWorkspaces, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace:workspaces!inner(*)')
        .eq('user_id', user.id)
        .eq('workspace.workspace_type', 'fifo_inventory');

      if (memberError) throw memberError;

      const memberWorkspacesData = memberWorkspaces?.map((m: any) => m.workspace).filter(Boolean) || [];
      const allWorkspaces = [...(ownedWorkspaces || []), ...memberWorkspacesData];

      // Remove duplicates and enrich with counts
      const uniqueWorkspaces = Array.from(
        new Map(allWorkspaces.map(w => [w.id, w])).values()
      );

      // Fetch counts for each workspace
      const enrichedWorkspaces = await Promise.all(
        uniqueWorkspaces.map(async (workspace) => {
          const [memberCount, storeCount] = await Promise.all([
            supabase
              .from('workspace_members')
              .select('id', { count: 'exact', head: true })
              .eq('workspace_id', workspace.id),
            supabase
              .from('fifo_stores')
              .select('id', { count: 'exact', head: true })
              .eq('workspace_id', workspace.id)
          ]);

          return {
            ...workspace,
            member_count: memberCount.count || 0,
            store_count: storeCount.count || 0
          };
        })
      );

      setWorkspaces(enrichedWorkspaces);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      toast.error("Failed to load workspaces");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [user]);

  const handleCreate = async () => {
    if (!user || !formData.name.trim()) {
      toast.error("Please enter a workspace name");
      return;
    }

    try {
      const { error } = await supabase
        .from('workspaces')
        .insert({
          name: formData.name,
          description: formData.description,
          owner_id: user.id,
          workspace_type: 'fifo_inventory',
        });

      if (error) throw error;

      toast.success("FIFO workspace created successfully");
      setShowCreateDialog(false);
      setFormData({ name: "", description: "" });
      fetchWorkspaces();
      refreshWorkspaces();
    } catch (error) {
      console.error('Error creating workspace:', error);
      toast.error("Failed to create workspace");
    }
  };

  const handleUpdate = async () => {
    if (!selectedWorkspace || !formData.name.trim()) {
      toast.error("Please enter a workspace name");
      return;
    }

    try {
      const { error } = await supabase
        .from('workspaces')
        .update({
          name: formData.name,
          description: formData.description,
        })
        .eq('id', selectedWorkspace.id);

      if (error) throw error;

      toast.success("Workspace updated successfully");
      setShowEditDialog(false);
      setSelectedWorkspace(null);
      setFormData({ name: "", description: "" });
      fetchWorkspaces();
      refreshWorkspaces();
    } catch (error) {
      console.error('Error updating workspace:', error);
      toast.error("Failed to update workspace");
    }
  };

  const handleDelete = async (workspaceId: string) => {
    if (!confirm("Are you sure you want to delete this workspace? This will remove all associated data.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);

      if (error) throw error;

      toast.success("Workspace deleted successfully");
      fetchWorkspaces();
      refreshWorkspaces();
    } catch (error) {
      console.error('Error deleting workspace:', error);
      toast.error("Failed to delete workspace");
    }
  };

  const openEditDialog = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setFormData({
      name: workspace.name,
      description: workspace.description || "",
    });
    setShowEditDialog(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">FIFO Inventory Workspaces</h1>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Workspace
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading workspaces...</div>
        ) : workspaces.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No FIFO workspaces yet</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Workspace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {workspaces.map((workspace) => (
              <Card key={workspace.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{workspace.name}</span>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(workspace)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(workspace.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardTitle>
                  {workspace.description && (
                    <CardDescription>{workspace.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      <span>{workspace.store_count || 0} stores</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{workspace.member_count || 0} members</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create FIFO Workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace for FIFO inventory management
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Workspace Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter workspace name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter workspace description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workspace</DialogTitle>
            <DialogDescription>
              Update workspace details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Workspace Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter workspace name"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter workspace description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
