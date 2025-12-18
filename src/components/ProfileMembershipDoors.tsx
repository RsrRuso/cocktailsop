import { useNavigate } from 'react-router-dom';
import { useUserMemberships, Membership } from '@/hooks/useUserMemberships';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { DoorOpen } from 'lucide-react';

interface ProfileMembershipDoorsProps {
  userId: string | null;
}

const DoorCard = ({ membership, index }: { membership: Membership; index: number }) => {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={() => navigate(membership.route)}
      className={`relative flex flex-col items-center p-3 rounded-xl bg-gradient-to-b ${membership.color} border backdrop-blur-sm hover:scale-105 transition-transform active:scale-95 min-w-[100px] max-w-[130px]`}
    >
      {/* Door frame */}
      <div className="relative w-14 h-18 rounded-t-lg bg-gradient-to-b from-white/10 to-white/5 border border-white/20 overflow-hidden flex items-center justify-center">
        {/* Door knob */}
        <div className="absolute right-1.5 top-1/2 w-2 h-2 rounded-full bg-amber-400 shadow-sm" />
        {/* Icon in door */}
        <span className="text-3xl">{membership.icon}</span>
      </div>
      
      {/* Name - full readable */}
      <p className="mt-2 text-xs font-semibold text-foreground text-center px-1 break-words">
        {membership.name}
      </p>
      
      {/* Role badge - more readable */}
      {membership.role && (
        <span className="mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-foreground/80">
          {membership.role}
        </span>
      )}
    </motion.button>
  );
};

export const ProfileMembershipDoors = ({ userId }: ProfileMembershipDoorsProps) => {
  const { memberships, isLoading } = useUserMemberships(userId);

  if (isLoading || memberships.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 px-1">
        <DoorOpen className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">My Spaces</span>
        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 ml-auto">
          {memberships.length}
        </Badge>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {memberships.map((membership, index) => (
          <DoorCard key={`${membership.type}-${membership.id}`} membership={membership} index={index} />
        ))}
      </div>
    </div>
  );
};
