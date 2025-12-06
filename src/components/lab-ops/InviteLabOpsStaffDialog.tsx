import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Search, UserPlus, Users, UserCheck, Loader2, Check } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface InviteLabOpsStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outletId: string;
  outletName: string;
  onStaffAdded: () => void;
}

export default function InviteLabOpsStaffDialog({
  open,
  onOpenChange,
  outletId,
  outletName,
  onStaffAdded
}: InviteLabOpsStaffDialogProps) {
  const { user } = useAuth();
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [existingStaffIds, setExistingStaffIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Map<string, string>>(new Map()); // userId -> role
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchConnections();
      fetchExistingStaff();
    }
  }, [open, user]);

  const fetchConnections = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Fetch followers
      const { data: followersData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id);

      if (followersData?.length) {
        const followerIds = followersData.map(f => f.follower_id);
        const { data: followerProfiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', followerIds);
        setFollowers(followerProfiles || []);
      }

      // Fetch following
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followingData?.length) {
        const followingIds = followingData.map(f => f.following_id);
        const { data: followingProfiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', followingIds);
        setFollowing(followingProfiles || []);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExistingStaff = async () => {
    const { data } = await supabase
      .from('lab_ops_staff')
      .select('user_id')
      .eq('outlet_id', outletId);
    
    if (data) {
      setExistingStaffIds(new Set(data.map(s => s.user_id).filter(Boolean)));
    }
  };

  const toggleUserSelection = (userId: string, defaultRole: string = 'bartender') => {
    setSelectedUsers(prev => {
      const newMap = new Map(prev);
      if (newMap.has(userId)) {
        newMap.delete(userId);
      } else {
        newMap.set(userId, defaultRole);
      }
      return newMap;
    });
  };

  const updateUserRole = (userId: string, role: string) => {
    setSelectedUsers(prev => {
      const newMap = new Map(prev);
      newMap.set(userId, role);
      return newMap;
    });
  };

  const inviteSelectedUsers = async () => {
    if (selectedUsers.size === 0) return;
    setInviting(true);

    type StaffRole = 'admin' | 'bartender' | 'kitchen' | 'manager' | 'supervisor' | 'waiter';

    try {
      const staffToAdd = Array.from(selectedUsers.entries()).map(([userId, role]) => ({
        outlet_id: outletId,
        user_id: userId,
        full_name: [...followers, ...following].find(p => p.id === userId)?.full_name || 
                   [...followers, ...following].find(p => p.id === userId)?.username || 'Staff',
        role: role as StaffRole,
        pin_code: Math.floor(1000 + Math.random() * 9000).toString(),
        is_active: true
      }));

      const { error } = await supabase
        .from('lab_ops_staff')
        .insert(staffToAdd);

      if (error) throw error;

      toast({
        title: "Staff invited!",
        description: `${selectedUsers.size} team member(s) added to ${outletName}`
      });

      setSelectedUsers(new Map());
      onStaffAdded();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setInviting(false);
    }
  };

  const filterProfiles = (profiles: Profile[]) => {
    if (!searchQuery) return profiles;
    const query = searchQuery.toLowerCase();
    return profiles.filter(p => 
      p.username?.toLowerCase().includes(query) ||
      p.full_name?.toLowerCase().includes(query)
    );
  };

  const renderUserItem = (profile: Profile) => {
    const isExisting = existingStaffIds.has(profile.id);
    const isSelected = selectedUsers.has(profile.id);
    const selectedRole = selectedUsers.get(profile.id);

    return (
      <div
        key={profile.id}
        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
          isExisting 
            ? 'opacity-50 cursor-not-allowed bg-muted/30' 
            : isSelected 
              ? 'bg-primary/10 border border-primary/30' 
              : 'hover:bg-muted/50 cursor-pointer'
        }`}
        onClick={() => !isExisting && toggleUserSelection(profile.id)}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={profile.avatar_url || ''} />
          <AvatarFallback className="bg-primary/20 text-primary">
            {(profile.full_name || profile.username || '?')[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {profile.full_name || profile.username}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            @{profile.username}
          </p>
        </div>

        {isExisting ? (
          <Badge variant="secondary" className="text-xs">Already Staff</Badge>
        ) : isSelected ? (
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <Select value={selectedRole} onValueChange={(val) => updateUserRole(profile.id, val)}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="bartender">Bartender</SelectItem>
                <SelectItem value="waiter">Server</SelectItem>
                <SelectItem value="kitchen">Kitchen</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Check className="h-5 w-5 text-primary" />
          </div>
        ) : (
          <UserPlus className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Invite Staff to {outletName}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search connections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs defaultValue="followers" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="followers" className="gap-1">
              <Users className="h-4 w-4" />
              Followers ({followers.length})
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-1">
              <UserCheck className="h-4 w-4" />
              Following ({following.length})
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <TabsContent value="followers" className="flex-1 min-h-0 mt-2">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1 pr-3">
                    {filterProfiles(followers).length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-8">
                        No followers found
                      </p>
                    ) : (
                      filterProfiles(followers).map(renderUserItem)
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="following" className="flex-1 min-h-0 mt-2">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-1 pr-3">
                    {filterProfiles(following).length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-8">
                        No following found
                      </p>
                    ) : (
                      filterProfiles(following).map(renderUserItem)
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </>
          )}
        </Tabs>

        {selectedUsers.size > 0 && (
          <div className="pt-3 border-t">
            <Button 
              onClick={inviteSelectedUsers} 
              className="w-full gap-2"
              disabled={inviting}
            >
              {inviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Add {selectedUsers.size} Staff Member{selectedUsers.size > 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
