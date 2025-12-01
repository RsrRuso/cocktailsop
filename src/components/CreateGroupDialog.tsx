import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Search, Users, Check, X, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import OptimizedAvatar from './OptimizedAvatar';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Contact {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
}

export const CreateGroupDialog = ({
  open,
  onOpenChange,
  currentUserId,
}: CreateGroupDialogProps) => {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      fetchContacts();
      setGroupName('');
      setGroupDescription('');
      setGroupAvatar(null);
      setGroupAvatarPreview(null);
      setSelectedMembers(new Set());
      setSearchQuery('');
    }
  }, [open]);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      // Get users who follow the current user or who the current user follows
      const { data: follows } = await supabase
        .from('follows')
        .select('follower_id, following_id')
        .or(`follower_id.eq.${currentUserId},following_id.eq.${currentUserId}`);

      if (follows) {
        const contactIds = new Set<string>();
        follows.forEach(follow => {
          if (follow.follower_id !== currentUserId) contactIds.add(follow.follower_id);
          if (follow.following_id !== currentUserId) contactIds.add(follow.following_id);
        });

        if (contactIds.size > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .in('id', Array.from(contactIds));

          if (profiles) {
            setContacts(profiles);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contacts',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMember = (contactId: string) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Avatar must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }
      setGroupAvatar(file);
      setGroupAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.size === 0) {
      toast({
        title: 'Missing information',
        description: 'Please provide a group name and select at least one member',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      let avatarUrl: string | null = null;

      // Upload avatar if provided
      if (groupAvatar) {
        const fileExt = groupAvatar.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `group-avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, groupAvatar);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        avatarUrl = publicUrl;
      }

      // Create group conversation
      const participantIds = [currentUserId, ...Array.from(selectedMembers)];
      
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          participant_ids: participantIds,
          is_group: true,
          group_name: groupName.trim(),
          group_description: groupDescription.trim() || null,
          group_avatar_url: avatarUrl,
          created_by: currentUserId,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (convError) throw convError;

      // Create group member records
      const groupMembers = participantIds.map(userId => ({
        conversation_id: conversation.id,
        user_id: userId,
        role: userId === currentUserId ? 'admin' : 'member',
      }));

      const { error: membersError } = await supabase
        .from('group_members')
        .insert(groupMembers);

      if (membersError) throw membersError;

      toast({
        title: 'Group created',
        description: `${groupName} has been created successfully`,
      });

      onOpenChange(false);
      navigate(`/messages/${conversation.id}`);
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: 'Error',
        description: 'Failed to create group',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass backdrop-blur-xl border-primary/20 max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            <Users className="w-5 h-5 text-primary" />
            Create Group
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Group Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden glass border-2 border-primary/20">
                {groupAvatarPreview ? (
                  <img src={groupAvatarPreview} alt="Group avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center shadow-lg"
              >
                <Camera className="w-4 h-4 text-primary-foreground" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Group Photo</p>
              <p className="text-xs text-muted-foreground">Click camera to upload</p>
            </div>
          </div>

          {/* Group Info */}
          <div className="space-y-3">
            <Input
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="glass border-border/50"
              maxLength={50}
            />
            <Textarea
              placeholder="Group description (optional)"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              className="glass border-border/50 resize-none h-20"
              maxLength={200}
            />
          </div>

          {/* Search Members */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 glass border-border/50"
            />
          </div>

          {/* Selected count */}
          {selectedMembers.size > 0 && (
            <div className="glass rounded-lg px-3 py-2 flex items-center justify-between">
              <p className="text-sm text-primary font-medium">
                {selectedMembers.size} member{selectedMembers.size > 1 ? 's' : ''} selected
              </p>
              <Button
                size="sm"
                onClick={() => setSelectedMembers(new Set())}
                variant="ghost"
                className="h-7 text-xs"
              >
                Clear
              </Button>
            </div>
          )}

          {/* Members list */}
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="glass rounded-xl p-3 flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                </div>
              ))
            ) : filteredContacts.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <p className="text-muted-foreground">No contacts found</p>
              </div>
            ) : (
              filteredContacts.map(contact => {
                const isSelected = selectedMembers.has(contact.id);
                return (
                  <button
                    key={contact.id}
                    onClick={() => toggleMember(contact.id)}
                    className={`w-full glass-hover rounded-xl p-3 flex items-center gap-3 transition-all duration-200 ${
                      isSelected ? 'ring-2 ring-primary glow-primary' : ''
                    }`}
                  >
                    <OptimizedAvatar
                      src={contact.avatar_url}
                      alt={contact.username}
                      fallback={contact.username[0]?.toUpperCase()}
                      userId={contact.id}
                      className="w-12 h-12"
                    />
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-normal text-sm truncate">{contact.full_name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        @{contact.username}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-border/50">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 glass"
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateGroup}
            className="flex-1 bg-primary hover:bg-primary/90"
            disabled={!groupName.trim() || selectedMembers.size === 0 || isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Group'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
