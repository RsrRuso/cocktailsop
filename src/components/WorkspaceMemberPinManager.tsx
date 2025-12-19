import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Key, Shuffle, Eye, EyeOff, Check, Users, Loader2 } from "lucide-react";

interface WorkspaceMember {
  id: string;
  user_id: string;
  role: string;
  pin_code: string | null;
  displayName: string;
}

interface WorkspaceMemberPinManagerProps {
  workspaceId: string;
  workspaceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkspaceMemberPinManager({
  workspaceId,
  workspaceName,
  open,
  onOpenChange,
}: WorkspaceMemberPinManagerProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<WorkspaceMember | null>(null);
  const [newPin, setNewPin] = useState("");
  const [showPin, setShowPin] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      
      // Fetch workspace members
      const { data: membersData, error: membersError } = await supabase
        .from("workspace_members")
        .select("id, user_id, role, pin_code")
        .eq("workspace_id", workspaceId);

      if (membersError) throw membersError;
      
      // Fetch profiles for all member user_ids
      const userIds = (membersData || []).map(m => m.user_id);
      let profilesData: any[] = [];
      
      if (userIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        profilesData = data || [];
      }
      
      // Map profiles to members
      const enrichedMembers: WorkspaceMember[] = (membersData || []).map(member => {
        const profile = profilesData.find(p => p.id === member.user_id);
        return {
          ...member,
          displayName: profile?.full_name || profile?.email || "Unknown Member"
        };
      });

      setMembers(enrichedMembers);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast.error("Failed to load members");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && workspaceId) {
      fetchMembers();
    }
  }, [open, workspaceId]);

  const generateRandomPin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setNewPin(pin);
  };

  const handleSavePin = async () => {
    if (!editingMember) return;
    
    if (newPin && (newPin.length < 4 || !/^\d+$/.test(newPin))) {
      toast.error("PIN must be at least 4 digits");
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from("workspace_members")
        .update({ pin_code: newPin || null })
        .eq("id", editingMember.id);

      if (error) throw error;

      // Send notification to member when PIN is granted/updated
      if (newPin && editingMember.user_id) {
        const notificationContent = `🔐 You've been granted access PIN: **${newPin}** for workspace "${workspaceName}". Keep this PIN secure for mobile access.`;
        
        await supabase
          .from("notifications")
          .insert({
            user_id: editingMember.user_id,
            type: "pin_granted",
            content: notificationContent,
            read: false
          });
      }

      toast.success(newPin ? "PIN updated successfully" : "PIN removed");
      setEditingMember(null);
      setNewPin("");
      fetchMembers();
    } catch (error) {
      console.error("Error updating PIN:", error);
      toast.error("Failed to update PIN");
    } finally {
      setSaving(false);
    }
  };

  const toggleShowPin = (memberId: string) => {
    setShowPin(prev => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  const getMemberDisplayName = (member: WorkspaceMember) => {
    return member.displayName || "Unknown Member";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Manage Member PINs
          </DialogTitle>
          <DialogDescription>
            Set PIN codes for {workspaceName} members to enable mobile access
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No members in this workspace yet</p>
            <p className="text-sm">Invite members first to set their PINs</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-2 pr-2">
              {members.map((member) => (
                <Card key={member.id} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {getMemberDisplayName(member)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {member.role}
                        </Badge>
                        {member.pin_code ? (
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs font-mono">
                              {showPin[member.id] ? member.pin_code : "••••"}
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5"
                              onClick={() => toggleShowPin(member.id)}
                            >
                              {showPin[member.id] ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No PIN</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingMember(member);
                        setNewPin(member.pin_code || "");
                      }}
                    >
                      <Key className="h-3 w-3 mr-1" />
                      {member.pin_code ? "Edit" : "Set"}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Edit PIN Dialog */}
        <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>
                {editingMember?.pin_code ? "Edit PIN Code" : "Set PIN Code"}
              </DialogTitle>
              <DialogDescription>
                PIN for {editingMember ? getMemberDisplayName(editingMember) : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="pin">PIN Code (4+ digits)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="pin"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter PIN"
                    className="font-mono text-center text-lg tracking-widest"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={generateRandomPin}
                    title="Generate random PIN"
                  >
                    <Shuffle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {editingMember?.pin_code && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setNewPin("")}
                >
                  Remove PIN
                </Button>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingMember(null)}>
                Cancel
              </Button>
              <Button onClick={handleSavePin} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Save PIN
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
