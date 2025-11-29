import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, X } from "lucide-react";
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

  useEffect(() => {
    if (open) {
      fetchMembers();
      fetchAvailableUsers();
    }
  }, [open, groupId]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('mixologist_group_members')
        .select('*, profiles(id, username, full_name, avatar_url)')
        .eq('group_id', groupId);
      
      if (error) {
        console.error('Error fetching members:', error);
        toast.error('Failed to fetch members: ' + error.message);
        return;
      }
      
      console.log('Fetched members:', data);
      setMembers(data || []);
    } catch (err: any) {
      console.error('Exception fetching members:', err);
      toast.error('Error: ' + err.message);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Group Members - {groupName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Members */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Current Members ({members.length})</h3>
            <ScrollArea className="h-48 glass rounded-lg p-3">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No members yet</p>
              ) : (
                <div className="space-y-2">
                  {members.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between p-2 glass rounded-lg">
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
