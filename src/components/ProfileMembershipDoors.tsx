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
      className={`relative flex flex-col items-center p-3 rounded-xl bg-gradient-to-b ${membership.color} border backdrop-blur-sm hover:scale-105 transition-transform active:scale-95`}
    >
      {/* Door frame */}
      <div className="relative w-12 h-16 rounded-t-lg bg-gradient-to-b from-white/10 to-white/5 border border-white/20 overflow-hidden">
        {/* Door knob */}
        <div className="absolute right-1 top-1/2 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm" />
        {/* Icon in door */}
        <div className="absolute inset-0 flex items-center justify-center text-2xl">
          {membership.icon}
        </div>
      </div>
      
      {/* Name badge */}
      <div className="mt-2 text-center">
        <p className="text-[10px] font-medium text-foreground/90 line-clamp-1 max-w-[70px]">
          {membership.name}
        </p>
        {membership.role && (
          <Badge variant="outline" className="text-[8px] px-1 py-0 h-3 mt-0.5 border-white/20">
            {membership.role}
          </Badge>
        )}
      </div>
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
