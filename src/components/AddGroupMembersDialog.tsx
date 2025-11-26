import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, UserPlus, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import OptimizedAvatar from './OptimizedAvatar';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

interface AddGroupMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  currentUserId: string;
  existingMemberIds: string[];
  onMembersAdded: () => void;
}

export const AddGroupMembersDialog = ({
  open,
  onOpenChange,
  conversationId,
  currentUserId,
  existingMemberIds,
  onMembersAdded,
}: AddGroupMembersDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchConnections();
      setSelectedUsers(new Set());
    }
  }, [open, currentUserId]);

  const fetchConnections = async () => {
    setIsLoading(true);
    try {
      // Fetch followers
      const { data: followersData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', currentUserId);

      // Fetch following
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId);

      const followerIds = followersData?.map(f => f.follower_id) || [];
      const followingIds = followingData?.map(f => f.following_id) || [];
      
      // Filter out existing members
      const availableFollowerIds = followerIds.filter(id => !existingMemberIds.includes(id));
      const availableFollowingIds = followingIds.filter(id => !existingMemberIds.includes(id));

      // Fetch profiles
      if (availableFollowerIds.length > 0) {
        const { data: followerProfiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', availableFollowerIds);
        setFollowers(followerProfiles || []);
      }

      if (availableFollowingIds.length > 0) {
        const { data: followingProfiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', availableFollowingIds);
        setFollowing(followingProfiles || []);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleAddMembers = async () => {
    if (selectedUsers.size === 0) {
      toast({
        title: 'No members selected',
        description: 'Please select at least one member to add',
        variant: 'destructive',
      });
      return;
    }

    setIsAdding(true);
    try {
      // Add to group_members table
      const groupMembersData = Array.from(selectedUsers).map(userId => ({
        conversation_id: conversationId,
        user_id: userId,
        role: 'member',
      }));

      const { error: membersError } = await supabase
        .from('group_members')
        .insert(groupMembersData);

      if (membersError) throw membersError;

      // Update conversation participant_ids
      const { data: conv } = await supabase
        .from('conversations')
        .select('participant_ids')
        .eq('id', conversationId)
        .single();

      if (conv) {
        const newParticipants = [...conv.participant_ids, ...Array.from(selectedUsers)];
        await supabase
          .from('conversations')
          .update({ participant_ids: newParticipants })
          .eq('id', conversationId);
      }

      toast({
        title: 'Members added',
        description: `Successfully added ${selectedUsers.size} member(s) to the group`,
      });

      onMembersAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding members:', error);
      toast({
        title: 'Error',
        description: 'Failed to add members to group',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const filterProfiles = (profiles: Profile[]) => {
    if (!searchQuery) return profiles;
    return profiles.filter(p =>
      p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const renderProfileList = (profiles: Profile[]) => {
    const filtered = filterProfiles(profiles);
    
    if (filtered.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No available members found
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filtered.map(profile => (
          <div
            key={profile.id}
            onClick={() => toggleUser(profile.id)}
            className={`glass rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all ${
              selectedUsers.has(profile.id) ? 'bg-primary/10 border-2 border-primary/50' : 'hover:bg-muted/50'
            }`}
          >
            <OptimizedAvatar
              src={profile.avatar_url}
              alt={profile.username}
              fallback={profile.username[0]?.toUpperCase()}
              userId={profile.id}
              className="w-12 h-12"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{profile.full_name}</p>
              <p className="text-sm text-muted-foreground truncate">@{profile.username}</p>
            </div>
            {selectedUsers.has(profile.id) && (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass backdrop-blur-xl border-primary/20 max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            <UserPlus className="w-5 h-5 text-primary" />
            Add Members
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search connections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass pl-10 border-border/50"
            />
          </div>

          {/* Selected Count */}
          {selectedUsers.size > 0 && (
            <div className="glass rounded-lg p-3 border border-primary/20">
              <p className="text-sm font-medium">
                {selectedUsers.size} member(s) selected
              </p>
            </div>
          )}

          {/* Tabs and Lists */}
          <div className="flex-1 overflow-hidden">
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="glass rounded-lg p-3 text-center">
                <p className="text-sm font-semibold">Following</p>
                <p className="text-xs text-muted-foreground">{following.length} available</p>
              </div>
              <div className="glass rounded-lg p-3 text-center">
                <p className="text-sm font-semibold">Followers</p>
                <p className="text-xs text-muted-foreground">{followers.length} available</p>
              </div>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="glass rounded-xl p-3 flex items-center gap-3 animate-pulse">
                      <div className="w-12 h-12 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-3 w-24 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {following.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 px-1">Following</h3>
                      {renderProfileList(following)}
                    </div>
                  )}
                  {followers.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 px-1">Followers</h3>
                      {renderProfileList(followers)}
                    </div>
                  )}
                  {following.length === 0 && followers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No available connections. All your connections are already in this group.
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-border/50">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 glass"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddMembers}
            disabled={selectedUsers.size === 0 || isAdding}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {isAdding ? 'Adding...' : `Add (${selectedUsers.size})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
