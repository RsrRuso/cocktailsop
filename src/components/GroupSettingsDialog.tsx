import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Users, UserPlus, UserMinus, Settings, Save, Trash2, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import OptimizedAvatar from './OptimizedAvatar';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface GroupMember {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  role: 'admin' | 'member';
}

interface GroupSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  currentUserId: string;
  isAdmin: boolean;
}

export const GroupSettingsDialog = ({
  open,
  onOpenChange,
  conversationId,
  currentUserId,
  isAdmin,
}: GroupSettingsDialogProps) => {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      fetchGroupInfo();
    }
  }, [open, conversationId]);

  const fetchGroupInfo = async () => {
    setIsLoading(true);
    try {
      // Fetch conversation info
      const { data: conv } = await supabase
        .from('conversations')
        .select('group_name, group_description')
        .eq('id', conversationId)
        .single();

      if (conv) {
        setGroupName(conv.group_name || '');
        setGroupDescription(conv.group_description || '');
      }

      // Fetch group members
      const { data: groupMembers } = await supabase
        .from('group_members')
        .select('user_id, role')
        .eq('conversation_id', conversationId);

      if (groupMembers && groupMembers.length > 0) {
        const userIds = groupMembers.map(m => m.user_id);
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', userIds);

        if (profiles) {
          const membersWithRoles: GroupMember[] = profiles.map(profile => {
            const memberData = groupMembers.find(m => m.user_id === profile.id);
            return {
              ...profile,
              role: (memberData?.role as 'admin' | 'member') || 'member',
            };
          });
          setMembers(membersWithRoles);
        }
      }
    } catch (error) {
      console.error('Error fetching group info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!groupName.trim()) {
      toast({
        title: 'Error',
        description: 'Group name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          group_name: groupName.trim(),
          group_description: groupDescription.trim() || null,
        })
        .eq('id', conversationId);

      if (error) throw error;

      toast({
        title: 'Group updated',
        description: 'Group settings have been saved',
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating group:', error);
      toast({
        title: 'Error',
        description: 'Failed to update group settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!isAdmin) return;

    try {
      // Remove from group_members
      await supabase
        .from('group_members')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', memberId);

      // Remove from conversation participant_ids
      const { data: conv } = await supabase
        .from('conversations')
        .select('participant_ids')
        .eq('id', conversationId)
        .single();

      if (conv) {
        const newParticipants = conv.participant_ids.filter(id => id !== memberId);
        await supabase
          .from('conversations')
          .update({ participant_ids: newParticipants })
          .eq('id', conversationId);
      }

      setMembers(prev => prev.filter(m => m.id !== memberId));
      
      toast({
        title: 'Member removed',
        description: 'Member has been removed from the group',
      });
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await handleRemoveMember(currentUserId);
      navigate('/messages');
      onOpenChange(false);
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  const handleDeleteGroup = async () => {
    if (!isAdmin) return;

    try {
      await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      toast({
        title: 'Group deleted',
        description: 'The group has been deleted',
      });

      navigate('/messages');
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete group',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass backdrop-blur-xl border-primary/20 max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              <Settings className="w-5 h-5 text-primary" />
              Group Settings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar">
            {/* Group Info */}
            {isAdmin && (
              <div className="space-y-3 pb-4 border-b border-border/50">
                <Input
                  placeholder="Group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="glass border-border/50"
                  maxLength={50}
                  disabled={!isAdmin}
                />
                <Textarea
                  placeholder="Group description"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="glass border-border/50 resize-none h-20"
                  maxLength={200}
                  disabled={!isAdmin}
                />
              </div>
            )}

            {/* Members Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Members ({members.length})
                </h3>
              </div>

              <div className="space-y-2">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="glass rounded-xl p-3 flex items-center gap-3 animate-pulse">
                      <div className="w-12 h-12 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-3 w-24 bg-muted rounded" />
                      </div>
                    </div>
                  ))
                ) : (
                  members.map(member => (
                    <div key={member.id} className="glass rounded-xl p-3 flex items-center gap-3">
                      <OptimizedAvatar
                        src={member.avatar_url}
                        alt={member.username}
                        fallback={member.username[0]?.toUpperCase()}
                        userId={member.id}
                        className="w-12 h-12"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{member.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          @{member.username}
                          {member.role === 'admin' && ' • Admin'}
                          {member.id === currentUserId && ' • You'}
                        </p>
                      </div>
                      {isAdmin && member.id !== currentUserId && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveMember(member.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/20"
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-border/50">
            {isAdmin && (
              <Button
                onClick={handleSave}
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
            
            <Button
              onClick={() => setShowLeaveDialog(true)}
              variant="outline"
              className="w-full glass"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Leave Group
            </Button>

            {isAdmin && (
              <Button
                onClick={() => setShowDeleteDialog(true)}
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Group
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent className="glass backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group?</AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer receive messages from this group. You can be added back by any group member.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveGroup} className="bg-destructive">
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="glass backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the group and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
