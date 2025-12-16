import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, X, Key, Check, Eye, EyeOff } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MixologistGroupMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
}

export function MixologistGroupMembersDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
}: MixologistGroupMembersDialogProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [pinValue, setPinValue] = useState("");
  const [showPin, setShowPin] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      fetchMembers();
      fetchAvailableUsers();
    }
  }, [open, groupId]);

  const fetchMembers = async () => {
    try {
      // First fetch raw members including pin_code
      const { data: memberRows, error: membersError } = await supabase
        .from('mixologist_group_members')
        .select('*')
        .eq('group_id', groupId);

      if (membersError) {
        console.error('Error fetching members:', membersError);
        toast.error('Failed to fetch members: ' + membersError.message);
        return;
      }

      if (!memberRows || memberRows.length === 0) {
        setMembers([]);
        return;
      }

      // Then fetch their profiles in a separate query to avoid implicit FK relationship
      const userIds = memberRows.map((m) => m.user_id).filter(Boolean);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching member profiles:', profilesError);
        toast.error('Failed to fetch member profiles: ' + profilesError.message);
        // Still show bare members without profile data
        setMembers(memberRows);
        return;
      }

      const profileMap = new Map<string, any>();
      (profiles || []).forEach((p: any) => {
        profileMap.set(p.id, p);
      });

      const enriched = memberRows.map((m: any) => ({
        ...m,
        profiles: profileMap.get(m.user_id) || null,
      }));

      console.log('Fetched members (enriched):', enriched);
      setMembers(enriched);
    } catch (err: any) {
      console.error('Exception fetching members:', err);
      toast.error('Failed to fetch members: ' + err.message);
    }
  };

  const fetchAvailableUsers = async () => {
    // Get all users
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .order('username');

    if (usersError || !allUsers) return;

    // Get current members
    const { data: currentMembers } = await supabase
      .from('mixologist_group_members')
      .select('user_id')
      .eq('group_id', groupId);

    const memberIds = currentMembers?.map(m => m.user_id) || [];
    
    // Filter out current members
    const available = allUsers.filter(user => !memberIds.includes(user.id));
    setAvailableUsers(available);
  };

  const handleAddMember = async (userId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('mixologist_group_members')
        .insert([{
          group_id: groupId,
          user_id: userId,
          role: 'member'
        }]);
      
      if (error) throw error;
      
      toast.success("Member added!");
      fetchMembers();
      fetchAvailableUsers();
    } catch (error: any) {
      toast.error("Failed to add member: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Remove this member from the group?")) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('mixologist_group_members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
      
      toast.success("Member removed!");
      fetchMembers();
      fetchAvailableUsers();
    } catch (error: any) {
      toast.error("Failed to remove member: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPin = (memberId: string, currentPin: string | null) => {
    setEditingPinId(memberId);
    setPinValue(currentPin || "");
  };

  const handleSavePin = async (memberId: string) => {
    if (pinValue && pinValue.length !== 4) {
      toast.error("PIN must be 4 digits");
      return;
    }
    
    if (pinValue && !/^\d{4}$/.test(pinValue)) {
      toast.error("PIN must contain only numbers");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('mixologist_group_members')
        .update({ pin_code: pinValue || null })
        .eq('id', memberId);
      
      if (error) throw error;
      
      toast.success(pinValue ? "PIN saved!" : "PIN removed!");
      setEditingPinId(null);
      setPinValue("");
      fetchMembers();
    } catch (error: any) {
      toast.error("Failed to save PIN: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingPinId(null);
    setPinValue("");
  };

  const toggleShowPin = (memberId: string) => {
    setShowPin(prev => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Manage Group Members - {groupName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto">
          {/* Current Members */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Current Members ({members.length})</h3>
            <ScrollArea className="h-64 glass rounded-lg p-3">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No members yet</p>
              ) : (
                <div className="space-y-3">
                  {members.map((member: any) => (
                    <div key={member.id} className="p-3 glass rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={member.profiles?.avatar_url} />
                            <AvatarFallback>
                              {member.profiles?.username?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {member.profiles?.full_name || member.profiles?.username}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                          </div>
                        </div>
                        {member.role !== 'admin' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={loading}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      {/* PIN Management */}
                      <div className="flex items-center gap-2 pl-13">
                        {editingPinId === member.id ? (
                          <>
                            <Input
                              type={showPin[member.id] ? "text" : "password"}
                              placeholder="4-digit PIN"
                              value={pinValue}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                setPinValue(val);
                              }}
                              className="w-24 h-8 text-center font-mono"
                              maxLength={4}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleShowPin(member.id)}
                            >
                              {showPin[member.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8"
                              onClick={() => handleSavePin(member.id)}
                              disabled={loading}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2"
                            onClick={() => handleEditPin(member.id, member.pin_code)}
                          >
                            <Key className="w-3 h-3" />
                            {member.pin_code ? (
                              <span className="text-xs">PIN: ••••</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Set PIN</span>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Available Users to Add */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Add Members</h3>
            <ScrollArea className="h-48 glass rounded-lg p-3">
              {availableUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No available users</p>
              ) : (
                <div className="space-y-2">
                  {availableUsers.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-2 glass rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {user.username?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {user.full_name || user.username}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddMember(user.id)}
                        disabled={loading}
                        className="glass-hover"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
