import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Users, KeyRound } from "lucide-react";

interface ProcurementStaff {
  id: string;
  full_name: string;
  role: string;
  pin_code: string;
  permissions: {
    can_create_po?: boolean;
    can_receive?: boolean;
  };
  is_active: boolean;
}

interface WorkspaceMember {
  user_id: string;
  profile: {
    id: string;
    full_name: string | null;
    username: string | null;
    email: string | null;
  } | null;
}

interface Props {
  workspaceId: string;
  workspaceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProcurementStaffManagement({ workspaceId, workspaceName, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<ProcurementStaff | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    role: "staff",
    pin_code: "",
    can_create_po: true,
    can_receive: true
  });

  // Fetch workspace members
  const { data: workspaceMembers = [] } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId);

      if (error) throw error;
      if (!members?.length) return [];

      // Fetch profiles for these members
      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, username, email")
        .in("id", userIds);

      if (profileError) throw profileError;

      return (profiles || []).map(p => ({
        user_id: p.id,
        profile: p
      })) as WorkspaceMember[];
    },
    enabled: !!workspaceId && open
  });

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["procurement-staff", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procurement_staff")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ProcurementStaff[];
    },
    enabled: !!workspaceId && open
  });

  const addStaffMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("procurement_staff").insert({
        workspace_id: workspaceId,
        full_name: data.full_name,
        role: data.role,
        pin_code: data.pin_code,
        permissions: {
          can_create_po: data.can_create_po,
          can_receive: data.can_receive
        },
        is_active: true
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement-staff", workspaceId] });
      toast.success("Staff member added");
      setShowAddDialog(false);
      resetForm();
    },
    onError: () => toast.error("Failed to add staff member")
  });

  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("procurement_staff")
        .update({
          full_name: data.full_name,
          role: data.role,
          pin_code: data.pin_code,
          permissions: {
            can_create_po: data.can_create_po,
            can_receive: data.can_receive
          }
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement-staff", workspaceId] });
      toast.success("Staff member updated");
      setEditingStaff(null);
      resetForm();
    },
    onError: () => toast.error("Failed to update staff member")
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("procurement_staff")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement-staff", workspaceId] });
      toast.success("Staff member removed");
    },
    onError: () => toast.error("Failed to remove staff member")
  });

  const resetForm = () => {
    setFormData({
      full_name: "",
      role: "staff",
      pin_code: "",
      can_create_po: true,
      can_receive: true
    });
  };

  const handleEdit = (s: ProcurementStaff) => {
    setEditingStaff(s);
    setFormData({
      full_name: s.full_name,
      role: s.role,
      pin_code: s.pin_code,
      can_create_po: s.permissions?.can_create_po ?? true,
      can_receive: s.permissions?.can_receive ?? true
    });
  };

  const handleSubmit = () => {
    if (!formData.full_name || !formData.pin_code) {
      toast.error("Name and PIN are required");
      return;
    }
    if (formData.pin_code.length !== 4 || !/^\d+$/.test(formData.pin_code)) {
      toast.error("PIN must be 4 digits");
      return;
    }

    if (editingStaff) {
      updateStaffMutation.mutate({ id: editingStaff.id, data: formData });
    } else {
      addStaffMutation.mutate(formData);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Staff Management - {workspaceName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Button onClick={() => setShowAddDialog(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Staff Member
            </Button>

            {isLoading ? (
              <p className="text-center text-muted-foreground py-4">Loading...</p>
            ) : staff.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No staff members yet. Add someone to enable PIN access.
              </p>
            ) : (
              <div className="space-y-2">
                {staff.map((s) => (
                  <Card key={s.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{s.full_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            <KeyRound className="w-3 h-3 mr-1" />
                            {s.pin_code}
                          </Badge>
                          {s.permissions?.can_create_po && (
                            <Badge variant="secondary" className="text-xs">PO</Badge>
                          )}
                          {s.permissions?.can_receive && (
                            <Badge variant="secondary" className="text-xs">Receive</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteStaffMutation.mutate(s.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Staff Dialog */}
      <Dialog open={showAddDialog || !!editingStaff} onOpenChange={(o) => {
        if (!o) {
          setShowAddDialog(false);
          setEditingStaff(null);
          resetForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Select Member</Label>
              <Select
                value={formData.full_name}
                onValueChange={(value) => setFormData({ ...formData, full_name: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select workspace member" />
                </SelectTrigger>
                <SelectContent>
                  {workspaceMembers.map((member) => {
                    const name = member.profile?.full_name || member.profile?.username || member.profile?.email || "Unknown";
                    return (
                      <SelectItem key={member.user_id} value={name}>
                        {name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>4-Digit PIN Code</Label>
              <Input
                value={formData.pin_code}
                onChange={(e) => setFormData({ ...formData, pin_code: e.target.value.replace(/\D/g, '').slice(0, 4) })}
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
                  checked={formData.can_create_po}
                  onCheckedChange={(c) => setFormData({ ...formData, can_create_po: c })}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Can Receive Items</span>
                <Switch
                  checked={formData.can_receive}
                  onCheckedChange={(c) => setFormData({ ...formData, can_receive: c })}
                />
              </div>
            </div>

            <Button onClick={handleSubmit} className="w-full">
              {editingStaff ? "Update" : "Add"} Staff Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
