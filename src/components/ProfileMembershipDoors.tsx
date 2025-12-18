import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserMemberships, Membership } from '@/hooks/useUserMemberships';
import { useSpacePresence } from '@/hooks/useSpacePresence';
import { useSpaceMembers } from '@/hooks/useSpaceMembers';
import { DoorOpen, Users, Wifi, X, Activity, Crown, Shield, User } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import OptimizedAvatar from '@/components/OptimizedAvatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { useCachedProfiles } from '@/hooks/useCachedProfiles';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkspaceActivityPanel } from '@/components/WorkspaceActivityPanel';
import { Badge } from '@/components/ui/badge';

interface ProfileMembershipDoorsProps {
  userId: string | null;
}

export const ProfileMembershipDoors = ({ userId }: ProfileMembershipDoorsProps) => {
  const navigate = useNavigate();
  const { memberships, isLoading } = useUserMemberships(userId);
  const { getOnlineCount, getOnlineUsers } = useSpacePresence(
    userId,
    memberships.map(m => ({ id: m.id, type: m.type }))
  );
  const { getProfile, fetchProfiles } = useCachedProfiles();
  const { members, memberCount, isLoading: membersLoading, fetchMembers, getMemberCount } = useSpaceMembers();
  
  const [selectedSpace, setSelectedSpace] = useState<Membership | null>(null);
  const [onlineProfiles, setOnlineProfiles] = useState<any[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  // Fetch member counts for all spaces on mount
  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      for (const m of memberships) {
        const count = await getMemberCount(m.id, m.type);
        counts[`${m.type}-${m.id}`] = count;
      }
      setMemberCounts(counts);
    };
    
    if (memberships.length > 0) {
      fetchCounts();
    }
  }, [memberships, getMemberCount]);

  const handleDoorPress = async (membership: Membership) => {
    console.log('[ProfileMembershipDoors] Door pressed:', membership.name, 'Type:', membership.type, 'ID:', membership.id);
    
    const onlineUsers = getOnlineUsers(membership.type, membership.id);
    
    if (onlineUsers.length > 0) {
      await fetchProfiles(onlineUsers.map(u => u.user_id));
      const profiles = onlineUsers.map(u => getProfile(u.user_id)).filter(Boolean);
      setOnlineProfiles(profiles);
    } else {
      setOnlineProfiles([]);
    }
    
    // Fetch all members for this space
    console.log('[ProfileMembershipDoors] Fetching members for:', membership.id, membership.type);
    await fetchMembers(membership.id, membership.type);
    console.log('[ProfileMembershipDoors] Members fetched, count:', members.length);
    
    setSelectedSpace(membership);
  };

  const handleGoToSpace = () => {
    if (selectedSpace) {
      navigate(selectedSpace.route);
      setSelectedSpace(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'owner':
      case 'admin':
        return <Crown className="w-3 h-3 text-amber-500" />;
      case 'manager':
      case 'moderator':
        return <Shield className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'owner':
        return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
      case 'admin':
        return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'manager':
      case 'moderator':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (isLoading || memberships.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <DoorOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">My Spaces</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium ml-auto">
            {memberships.length}
          </span>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {memberships.map((m) => {
            const onlineCount = getOnlineCount(m.type, m.id);
            const totalMembers = memberCounts[`${m.type}-${m.id}`] || m.memberCount || 0;
            
            return (
              <button
                key={`${m.type}-${m.id}`}
                onClick={() => handleDoorPress(m)}
                className="flex-shrink-0 flex flex-col items-center gap-1 active:opacity-70 transition-opacity"
              >
                {/* Circle container - Instagram style */}
                <div className="relative">
                  {/* Online ring indicator */}
                  <div className={`w-[68px] h-[68px] rounded-full p-[2px] ${
                    onlineCount > 0 
                      ? 'bg-gradient-to-tr from-foreground via-muted-foreground to-foreground' 
                      : 'bg-border'
                  }`}>
                    <div className="w-full h-full rounded-full bg-background p-[2px]">
                      <div className="w-full h-full rounded-full bg-muted/30 border border-border flex items-center justify-center">
                        <span className="text-2xl grayscale">{m.icon}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Online count badge */}
                  {onlineCount > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 flex items-center gap-0.5 bg-foreground text-background rounded-full px-1.5 py-0.5 text-[10px] font-bold shadow-sm">
                      <Wifi className="w-2.5 h-2.5" />
                      {onlineCount}
                    </div>
                  )}
                  
                  {/* Member count badge */}
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-muted border border-border rounded-full px-1.5 py-0.5">
                    <Users className="w-2.5 h-2.5 text-muted-foreground" />
                    <span className="text-[9px] font-medium text-muted-foreground">{totalMembers}</span>
                  </div>
                </div>
                
                {/* Name label */}
                <p className="text-[11px] font-medium text-muted-foreground max-w-[70px] truncate">
                  {m.name}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Space details sheet with activity */}
      <Sheet open={!!selectedSpace} onOpenChange={(open) => !open && setSelectedSpace(null)}>
        <SheetContent side="bottom" className="rounded-t-xl h-[70vh] flex flex-col">
          <SheetHeader className="pb-2 flex-shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <span className="text-xl">{selectedSpace?.icon}</span>
              {selectedSpace?.name}
              <div className="flex items-center gap-2 ml-2">
                <div className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-full text-xs">
                  <Users className="w-3 h-3" />
                  {memberCount} members
                </div>
                {onlineProfiles.length > 0 && (
                  <div className="flex items-center gap-1 bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-full text-xs font-medium">
                    <Wifi className="w-3 h-3" />
                    {onlineProfiles.length} online
                  </div>
                )}
              </div>
            </SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="members" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
              <TabsTrigger value="members" className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Members
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="online" className="flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5" />
                Online
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="flex-1 overflow-y-auto mt-3">
              {membersLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-muted/30" />
                      <div className="flex-1">
                        <div className="h-4 w-24 bg-muted/30 rounded mb-1" />
                        <div className="h-3 w-16 bg-muted/30 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : members.length > 0 ? (
                <div className="space-y-2">
                  {members.map((member) => {
                    const isOnline = onlineProfiles.some(p => p.id === member.user_id);
                    return (
                      <div 
                        key={member.id} 
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => navigate(`/user/${member.user_id}`)}
                      >
                        <div className="relative">
                          <OptimizedAvatar
                            src={member.profile?.avatar_url}
                            alt={member.profile?.username || 'Member'}
                            fallback={member.profile?.username?.[0] || 'M'}
                            className="w-10 h-10"
                          />
                          {isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm flex items-center gap-1.5 truncate">
                            {member.profile?.full_name || member.profile?.username || 'Unknown'}
                            {member.profile?.is_verified && <VerifiedBadge size="xs" />}
                            {getRoleIcon(member.role)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            @{member.profile?.username || 'unknown'}
                          </p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${getRoleBadgeVariant(member.role)}`}>
                          {member.role || 'Member'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No members found</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="flex-1 overflow-y-auto mt-3">
              {selectedSpace && (
                <WorkspaceActivityPanel 
                  workspaceId={selectedSpace.id} 
                  workspaceType={selectedSpace.type}
                />
              )}
            </TabsContent>

            <TabsContent value="online" className="flex-1 overflow-y-auto mt-3">
              {onlineProfiles.length > 0 ? (
                <div className="space-y-2">
                  {onlineProfiles.map((profile) => (
                    <div 
                      key={profile.id} 
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/user/${profile.id}`)}
                    >
                      <div className="relative">
                        <OptimizedAvatar
                          src={profile.avatar_url}
                          alt={profile.username}
                          fallback={profile.username?.[0] || '?'}
                          className="w-10 h-10"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
                      </div>
                      <div>
                        <p className="font-medium text-sm flex items-center gap-1">
                          {profile.full_name || profile.username}
                          {profile.is_verified && <VerifiedBadge size="xs" />}
                        </p>
                        <p className="text-xs text-muted-foreground">@{profile.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Wifi className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No one online right now</p>
                  <p className="text-xs mt-1">Members will appear here when they're active</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4 flex-shrink-0">
            <Button variant="ghost" className="flex-1" onClick={() => setSelectedSpace(null)}>
              <X className="w-4 h-4 mr-1.5" />
              Close
            </Button>
            <Button className="flex-1" onClick={handleGoToSpace}>
              Enter Space
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
