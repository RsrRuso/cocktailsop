import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserMemberships, Membership } from '@/hooks/useUserMemberships';
import { useSpacePresence } from '@/hooks/useSpacePresence';
import { DoorOpen, Users, Wifi, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import OptimizedAvatar from '@/components/OptimizedAvatar';
import { useCachedProfiles } from '@/hooks/useCachedProfiles';

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
    const onlineUsers = getOnlineUsers(membership.type, membership.id);
    
    if (onlineUsers.length > 0) {
      // Fetch profiles for online users
      await fetchProfiles(onlineUsers.map(u => u.user_id));
      const profiles = onlineUsers.map(u => getProfile(u.user_id)).filter(Boolean);
      setOnlineProfiles(profiles);
      setSelectedSpace(membership);
    } else {
      // No one online, navigate directly
      navigate(membership.route);
    }
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
        
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {memberships.map((m) => {
            const onlineCount = getOnlineCount(m.type, m.id);
            
            return (
              <button
                key={`${m.type}-${m.id}`}
                onClick={() => handleDoorPress(m)}
                className={`flex-shrink-0 relative flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-b ${m.color} border border-border/50 hover:scale-[1.02] active:scale-[0.98] transition-transform`}
              >
                {/* Online badge */}
                {onlineCount > 0 && (
                  <div className="absolute -top-1 -right-1 flex items-center gap-0.5 bg-emerald-500 rounded-full px-1.5 py-0.5 shadow-lg animate-pulse">
                    <Wifi className="w-2.5 h-2.5 text-white" />
                    <span className="text-[10px] font-bold text-white">{onlineCount}</span>
                  </div>
                )}
                
                <span className="text-xl">{m.icon}</span>
                <div className="text-left">
                  <p className="text-sm font-medium truncate max-w-[100px]">{m.name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>{m.memberCount}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Online members sheet */}
      <Sheet open={!!selectedSpace} onOpenChange={(open) => !open && setSelectedSpace(null)}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <span className="text-xl">{selectedSpace?.icon}</span>
              {selectedSpace?.name}
              <div className="flex items-center gap-1 ml-2 bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-full text-xs font-medium">
                <Wifi className="w-3 h-3" />
                {onlineProfiles.length} online
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-3 max-h-60 overflow-y-auto">
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
                  <p className="font-medium text-sm">{profile.full_name || profile.username}</p>
                  <p className="text-xs text-muted-foreground">@{profile.username}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t">
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
