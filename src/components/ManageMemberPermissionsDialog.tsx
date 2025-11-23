import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Package, ArrowRightLeft, Loader2, Users } from "lucide-react";
import OptimizedAvatar from "./OptimizedAvatar";

interface WorkspaceMember {
  id: string;
  user_id: string;
  role: string;
  permissions: {
    can_receive?: boolean;
    can_transfer?: boolean;
  };
  profiles?: {
    full_name: string;
    username: string;
    avatar_url: string;
  };
}

interface ManageMemberPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceName: string;
  onSuccess?: () => void;
}

export const ManageMemberPermissionsDialog = ({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
  onSuccess,
}: ManageMemberPermissionsDialogProps) => {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open, workspaceId]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data: membersData, error: membersError } = await supabase
        .from("workspace_members")
        .select("id, user_id, role, permissions")
        .eq("workspace_id", workspaceId)
        .order("role", { ascending: false });

      if (membersError) throw membersError;

      // Fetch profiles for all members
      const userIds = membersData?.map((m) => m.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Combine data
      const enrichedMembers: WorkspaceMember[] = membersData?.map((member) => ({
        ...member,
        permissions: (member.permissions as any) || { can_receive: false, can_transfer: false },
        profiles: profilesData?.find((p) => p.id === member.user_id),
      })) || [];

      setMembers(enrichedMembers);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = async (
    memberId: string,
    permissionKey: "can_receive" | "can_transfer",
    value: boolean
  ) => {
    setSaving(memberId);
    try {
      const member = members.find((m) => m.id === memberId);
      if (!member) return;

      const updatedPermissions = {
        ...member.permissions,
        [permissionKey]: value,
      };

      const { error } = await supabase
        .from("workspace_members")
        .update({ permissions: updatedPermissions })
        .eq("id", memberId);

      if (error) throw error;

      // Update local state
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? { ...m, permissions: updatedPermissions }
            : m
        )
      );

      toast.success("Permission updated");
      onSuccess?.();
    } catch (error: any) {
      console.error("Error updating permission:", error);
      toast.error(error.message || "Failed to update permission");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Shield className="w-5 h-5" />
            Manage Permissions - {workspaceName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Users className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No members found</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-4 sm:p-6 space-y-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <OptimizedAvatar
                        src={member.profiles?.avatar_url}
                        alt={member.profiles?.username || "User"}
                        className="w-10 h-10 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {member.profiles?.username}
                        </p>
                        {member.profiles?.full_name && (
                          <p className="text-sm text-muted-foreground truncate">
                            {member.profiles.full_name}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">
                          {member.role}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:gap-2">
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <Label
                          htmlFor={`receive-${member.id}`}
                          className="text-sm flex items-center gap-2 cursor-pointer"
                        >
                          <Package className="w-4 h-4" />
                          <span>Receive Access</span>
                        </Label>
                        <Switch
                          id={`receive-${member.id}`}
                          checked={member.permissions?.can_receive || false}
                          onCheckedChange={(checked) =>
                            updatePermission(member.id, "can_receive", checked)
                          }
                          disabled={saving === member.id || member.role === "admin"}
                        />
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <Label
                          htmlFor={`transfer-${member.id}`}
                          className="text-sm flex items-center gap-2 cursor-pointer"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                          <span>Transfer Access</span>
                        </Label>
                        <Switch
                          id={`transfer-${member.id}`}
                          checked={member.permissions?.can_transfer || false}
                          onCheckedChange={(checked) =>
                            updatePermission(member.id, "can_transfer", checked)
                          }
                          disabled={saving === member.id || member.role === "admin"}
                        />
                      </div>

                      {member.role === "admin" && (
                        <p className="text-xs text-muted-foreground text-right">
                          Admins have all permissions
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="px-4 sm:px-6 py-3 border-t shrink-0 bg-background">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 sm:h-10"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
