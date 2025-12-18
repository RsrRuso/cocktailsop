import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserMemberships, Membership } from '@/hooks/useUserMemberships';
import { useSpacePresence } from '@/hooks/useSpacePresence';
import { DoorOpen, Users, Wifi, X, Activity } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import OptimizedAvatar from '@/components/OptimizedAvatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { useCachedProfiles } from '@/hooks/useCachedProfiles';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkspaceActivityPanel } from '@/components/WorkspaceActivityPanel';

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
  
  const [selectedSpace, setSelectedSpace] = useState<Membership | null>(null);
  const [onlineProfiles, setOnlineProfiles] = useState<any[]>([]);

  const handleDoorPress = async (membership: Membership) => {
    // Always show the sheet with activity tracking
    const onlineUsers = getOnlineUsers(membership.type, membership.id);
    
    if (onlineUsers.length > 0) {
      await fetchProfiles(onlineUsers.map(u => u.user_id));
      const profiles = onlineUsers.map(u => getProfile(u.user_id)).filter(Boolean);
      setOnlineProfiles(profiles);
    } else {
      setOnlineProfiles([]);
    }
    
    setSelectedSpace(membership);
  };

  const handleGoToSpace = () => {
    if (selectedSpace) {
      navigate(selectedSpace.route);
      setSelectedSpace(null);
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
        
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {memberships.map((m) => {
            const onlineCount = getOnlineCount(m.type, m.id);
            
            return (
              <button
                key={`${m.type}-${m.id}`}
                onClick={() => handleDoorPress(m)}
                className="flex-shrink-0 relative flex flex-col items-center hover:scale-105 active:scale-95 transition-transform"
              >
                {/* Online badge */}
                {onlineCount > 0 && (
                  <div className="absolute -top-1 right-0 z-10 flex items-center gap-0.5 bg-emerald-500 rounded-full px-1.5 py-0.5 shadow-lg animate-pulse">
                    <Wifi className="w-2.5 h-2.5 text-white" />
                    <span className="text-[10px] font-bold text-white">{onlineCount}</span>
                  </div>
                )}
                
                {/* Door frame */}
                <div className={`relative w-16 h-24 rounded-t-[2rem] bg-gradient-to-b ${m.color} border-2 border-border/60 shadow-lg overflow-hidden`}>
                  {/* Door inner panel */}
                  <div className="absolute inset-2 rounded-t-[1.5rem] bg-gradient-to-b from-white/10 to-transparent border border-white/20" />
                  
                  {/* Door knob */}
                  <div className="absolute right-2.5 top-1/2 w-2 h-2 rounded-full bg-amber-400 shadow-md" />
                  
                  {/* Icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl drop-shadow-md">{m.icon}</span>
                  </div>
                  
                  {/* Member count */}
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                    <Users className="w-2.5 h-2.5 text-white/80" />
                    <span className="text-[9px] font-bold text-white">{m.memberCount}</span>
                  </div>
                </div>
                
                {/* Name badge below door */}
                <div className="mt-1.5 px-2 py-0.5 bg-card border border-border rounded-full shadow-sm">
                  <p className="text-[10px] font-semibold whitespace-nowrap">{m.name}</p>
                </div>
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
              {onlineProfiles.length > 0 && (
                <div className="flex items-center gap-1 ml-2 bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-full text-xs font-medium">
                  <Wifi className="w-3 h-3" />
                  {onlineProfiles.length} online
                </div>
              )}
            </SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="activity" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="activity" className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="online" className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Online ({onlineProfiles.length})
              </TabsTrigger>
            </TabsList>

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
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/user/${profile.id}`)}
                    >
                      <div className="relative">
                        <OptimizedAvatar
                          src={profile.avatar_url}
                          alt={profile.username}
                          fallback={profile.username?.[0] || '?'}
                          className="w-10 h-10"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
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
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No one online right now</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4 flex-shrink-0">
            <Button variant="outline" className="flex-1" onClick={() => setSelectedSpace(null)}>
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
