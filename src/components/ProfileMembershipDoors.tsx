import { useNavigate } from 'react-router-dom';
import { useUserMemberships, Membership } from '@/hooks/useUserMemberships';
import { useSpacePresence, usePlatformPresence } from '@/hooks/useSpacePresence';
import { motion } from 'framer-motion';
import { DoorOpen, Users, Wifi } from 'lucide-react';

interface ProfileMembershipDoorsProps {
  userId: string | null;
}

interface DoorCardProps {
  membership: Membership;
  index: number;
  onlineCount: number;
  isCurrentUserOnline: boolean;
}

const DoorCard = ({ membership, index, onlineCount, isCurrentUserOnline }: DoorCardProps) => {
  const navigate = useNavigate();
  const hasOnlineMembers = onlineCount > 0;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={() => navigate(membership.route)}
      className={`relative flex flex-col items-center p-3 pt-5 rounded-xl bg-gradient-to-b ${membership.color} border backdrop-blur-sm hover:scale-105 transition-transform active:scale-95 min-w-[110px] max-w-[140px]`}
    >
      {/* Top badges row */}
      <div className="absolute top-1 left-1 right-1 flex justify-between items-center">
        {/* Member count badge - left */}
        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 border border-white/10">
          <Users className="w-3 h-3 text-primary" />
          <span className="text-[11px] font-bold text-white">{membership.memberCount}</span>
        </div>

        {/* Online indicator - right (shows members currently on platform) */}
        {hasOnlineMembers && (
          <div className="flex items-center gap-1 bg-emerald-500 rounded-full px-2 py-0.5 shadow-lg shadow-emerald-500/50 animate-pulse">
            <Wifi className="w-3 h-3 text-white" />
            <span className="text-[11px] font-bold text-white">{onlineCount}</span>
          </div>
        )}
      </div>

      {/* Door frame with online indicator */}
      <div className="relative mt-1">
        <div className="relative w-16 h-20 rounded-t-lg bg-gradient-to-b from-white/15 to-white/5 border border-white/20 overflow-hidden flex items-center justify-center">
          {/* Door knob */}
          <div className="absolute right-2 top-1/2 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-md shadow-amber-400/50" />
          {/* Icon in door */}
          <span className="text-4xl">{membership.icon}</span>
        </div>
        
        {/* User's online status dot - shows if CURRENT user is signed in */}
        <div 
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-background transition-all duration-300 ${
            isCurrentUserOnline 
              ? 'bg-emerald-500 shadow-lg shadow-emerald-500/80' 
              : 'bg-gray-600/50'
          }`}
        >
          {isCurrentUserOnline && (
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
          )}
        </div>
      </div>
      
      {/* Name - full readable */}
      <p className="mt-3 text-sm font-bold text-foreground text-center leading-tight">
        {membership.name}
      </p>
      
      {/* Role badge */}
      {membership.role && (
        <span className="mt-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-black/40 text-foreground/90 border border-white/10">
          {membership.role}
        </span>
      )}
    </motion.button>
  );
};

export const ProfileMembershipDoors = ({ userId }: ProfileMembershipDoorsProps) => {
  const { memberships, isLoading } = useUserMemberships(userId);
  const { getOnlineCount } = useSpacePresence(
    userId,
    memberships.map(m => ({ id: m.id, type: m.type }))
  );
  const { isOnline } = usePlatformPresence(userId);

  if (isLoading || memberships.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <DoorOpen className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">My Spaces</span>
        
        {/* User's platform status indicator */}
        <div className="flex items-center gap-1.5 ml-2">
          <div 
            className={`w-2 h-2 rounded-full ${
              isOnline 
                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' 
                : 'bg-gray-500'
            }`}
          />
          <span className={`text-[10px] font-medium ${isOnline ? 'text-emerald-400' : 'text-muted-foreground'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-bold">
            {memberships.length}
          </span>
        </div>
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {memberships.map((membership, index) => (
          <DoorCard 
            key={`${membership.type}-${membership.id}`} 
            membership={membership} 
            index={index}
            onlineCount={getOnlineCount(membership.type, membership.id)}
            isCurrentUserOnline={isOnline}
          />
        ))}
      </div>
    </div>
  );
};
