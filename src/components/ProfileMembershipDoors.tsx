import { useNavigate } from 'react-router-dom';
import { useUserMemberships } from '@/hooks/useUserMemberships';
import { DoorOpen, Users } from 'lucide-react';

interface ProfileMembershipDoorsProps {
  userId: string | null;
}

export const ProfileMembershipDoors = ({ userId }: ProfileMembershipDoorsProps) => {
  const navigate = useNavigate();
  const { memberships, isLoading } = useUserMemberships(userId);

  if (isLoading || memberships.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <DoorOpen className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">My Spaces</span>
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium ml-auto">
          {memberships.length}
        </span>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {memberships.map((m) => (
          <button
            key={`${m.type}-${m.id}`}
            onClick={() => navigate(m.route)}
            className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-b ${m.color} border border-border/50 hover:scale-[1.02] active:scale-[0.98] transition-transform`}
          >
            <span className="text-xl">{m.icon}</span>
            <div className="text-left">
              <p className="text-sm font-medium truncate max-w-[100px]">{m.name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>{m.memberCount}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
