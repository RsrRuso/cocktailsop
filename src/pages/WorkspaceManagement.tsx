import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Building2, Users, Store, Edit, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Workspace {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  member_count?: number;
  store_count?: number;
}

const WorkspaceManagement = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const navigate = useNavigate();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch owned workspaces
      const { data: ownedWorkspaces, error: ownedError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("owner_id", user.id);

      if (ownedError) throw ownedError;

      // Fetch member workspaces
      const { data: memberWorkspaces, error: memberError } = await supabase
        .from("workspace_members")
        .select("workspace_id, workspaces(*)")
        .eq("user_id", user.id);

      if (memberError) throw memberError;

      // Combine and deduplicate
      const allWorkspaces = [
        ...(ownedWorkspaces || []),
        ...(memberWorkspaces?.map((m: any) => m.workspaces).filter(Boolean) || []),
      ];

      const uniqueWorkspaces = Array.from(
        new Map(allWorkspaces.map((w) => [w.id, w])).values()
      );

      // Fetch counts for each workspace
      const workspacesWithCounts = await Promise.all(
        uniqueWorkspaces.map(async (workspace) => {
          const [{ count: memberCount }, { count: storeCount }] = await Promise.all([
            supabase
              .from("workspace_members")
              .select("*", { count: "exact", head: true })
              .eq("workspace_id", workspace.id),
            supabase
              .from("stores")
              .select("*", { count: "exact", head: true })
              .eq("workspace_id", workspace.id),
          ]);

          return {
            ...workspace,
            member_count: memberCount || 0,
            store_count: storeCount || 0,
          };
        })
      );

      setWorkspaces(workspacesWithCounts);
    } catch (error) {
      console.error("Error fetching workspaces:", error);
      toast.error("Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Workspace name is required");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("workspaces").insert({
        name: formData.name,
        description: formData.description,
        owner_id: user.id,
      });

      if (error) throw error;

      toast.success("Workspace created successfully");
      setCreateOpen(false);
      setFormData({ name: "", description: "" });
      fetchWorkspaces();
    } catch (error) {
      console.error("Error creating workspace:", error);
      toast.error("Failed to create workspace");
    }
  };

  const handleUpdate = async () => {
    if (!selectedWorkspace || !formData.name.trim()) return;

    try {
      const { error } = await supabase
        .from("workspaces")
        .update({
          name: formData.name,
          description: formData.description,
        })
        .eq("id", selectedWorkspace.id);

      if (error) throw error;

      toast.success("Workspace updated successfully");
      setEditOpen(false);
      setSelectedWorkspace(null);
      setFormData({ name: "", description: "" });
      fetchWorkspaces();
    } catch (error) {
      console.error("Error updating workspace:", error);
      toast.error("Failed to update workspace");
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Delete ALL ${workspaces.length} workspace(s)?\n\nAll stores, inventory, and data will be safely moved to your personal account.\n\nThis action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all workspace IDs
      const workspaceIds = workspaces.map(w => w.id);

      if (workspaceIds.length === 0) {
        toast.info("No workspaces to delete");
        return;
      }

      // Make all data personal for all workspaces
      await supabase.from("stores").update({ workspace_id: null }).in("workspace_id", workspaceIds);
      await supabase.from("inventory").update({ workspace_id: null }).in("workspace_id", workspaceIds);
      await supabase.from("items").update({ workspace_id: null }).in("workspace_id", workspaceIds);
      await supabase.from("inventory_activity_log").update({ workspace_id: null }).in("workspace_id", workspaceIds);
      await supabase.from("inventory_transfers").update({ workspace_id: null }).in("workspace_id", workspaceIds);
      await supabase.from("inventory_spot_checks").update({ workspace_id: null }).in("workspace_id", workspaceIds);
      await supabase.from("variance_reports").update({ workspace_id: null }).in("workspace_id", workspaceIds);
      
      // Delete all workspace members
      await supabase.from("workspace_members").delete().in("workspace_id", workspaceIds);
      
      // Delete all workspaces
      const { error: workspaceError } = await supabase
        .from("workspaces")
        .delete()
        .in("id", workspaceIds);

      if (workspaceError) throw workspaceError;

      toast.success(`${workspaceIds.length} workspace(s) deleted - All data preserved!`);
      await fetchWorkspaces();
    } catch (error) {
      console.error("Error deleting all workspaces:", error);
      toast.error("Failed to delete workspaces");
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = async (workspace: Workspace) => {
    if (!confirm(`Delete "${workspace.name}"?\n\nAll stores and inventory will be kept safe and moved to your personal account.\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Step 1: Make all stores personal (remove workspace_id)
      const { error: storesError } = await supabase
        .from("stores")
        .update({ workspace_id: null })
        .eq("workspace_id", workspace.id);

      if (storesError) throw storesError;

      // Step 2: Make all inventory personal
      const { error: inventoryError } = await supabase
        .from("inventory")
        .update({ workspace_id: null })
        .eq("workspace_id", workspace.id);

      if (inventoryError) throw inventoryError;

      // Step 3: Make all items personal
      const { error: itemsError } = await supabase
        .from("items")
        .update({ workspace_id: null })
        .eq("workspace_id", workspace.id);

      if (itemsError) throw itemsError;

      // Step 4: Make all activity logs personal
      const { error: activityError } = await supabase
        .from("inventory_activity_log")
        .update({ workspace_id: null })
        .eq("workspace_id", workspace.id);

      if (activityError) throw activityError;

      // Step 5: Make all transfers personal
      const { error: transfersError } = await supabase
        .from("inventory_transfers")
        .update({ workspace_id: null })
        .eq("workspace_id", workspace.id);

      if (transfersError) throw transfersError;

      // Step 6: Delete workspace members
      const { error: membersError } = await supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspace.id);

      if (membersError) throw membersError;

      // Step 7: Finally delete the workspace
      const { error: workspaceError } = await supabase
        .from("workspaces")
        .delete()
        .eq("id", workspace.id);

      if (workspaceError) throw workspaceError;

      toast.success("Workspace deleted - All your data has been safely preserved!");
      fetchWorkspaces();
    } catch (error) {
      console.error("Error deleting workspace:", error);
      toast.error("Failed to delete workspace");
    }
  };

  const openEditDialog = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setFormData({
      name: workspace.name,
      description: workspace.description || "",
    });
    setEditOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="w-8 h-8 text-primary" />
              Workspace Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your workspaces and organize your stores
            </p>
          </div>

          <div className="flex gap-2">
            {workspaces.length > 0 && (
              <Button 
                onClick={handleDeleteAll} 
                variant="destructive"
                className="gap-2"
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? "Deleting..." : `Delete All (${workspaces.length})`}
              </Button>
            )}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Workspace
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Workspace</DialogTitle>
                </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Workspace Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter workspace name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Enter workspace description"
                    rows={3}
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">
                  Create Workspace
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">Loading workspaces...</p>
          </div>
        ) : workspaces.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full glass-hover flex items-center justify-center">
              <Building2 className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No Workspaces Yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first workspace to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((workspace) => (
              <Card
                key={workspace.id}
                className="glass p-6 hover:glass-hover transition-all cursor-pointer"
                onClick={() => navigate(`/store-management?workspace=${workspace.id}`)}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        {workspace.name}
                      </h3>
                      {workspace.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {workspace.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{workspace.store_count}</span>
                      <span className="text-muted-foreground">stores</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{workspace.member_count}</span>
                      <span className="text-muted-foreground">members</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(workspace);
                      }}
                      className="flex-1 gap-2"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(workspace);
                      }}
                      className="flex-1 gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Workspace Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter workspace name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter workspace description"
                rows={3}
              />
            </div>
            <Button onClick={handleUpdate} className="w-full">
              Update Workspace
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default WorkspaceManagement;
