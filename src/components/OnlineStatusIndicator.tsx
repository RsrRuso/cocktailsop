import { cn } from '@/lib/utils';
import { useScalableOnlineStatus } from '@/hooks/useScalablePresence';

interface OnlineStatusIndicatorProps {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const OnlineStatusIndicator = ({ 
  userId, 
  size = 'sm', 
  showLabel = false,
  className 
}: OnlineStatusIndicatorProps) => {
  // Use scalable presence system (database-based with batching)
  const isOnline = useScalableOnlineStatus(userId);

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  const labelSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div 
        className={cn(
          'rounded-full transition-colors duration-300',
          sizeClasses[size],
          isOnline 
            ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' 
            : 'bg-gray-500/50'
        )}
      />
      {showLabel && (
        <span className={cn(
          'font-medium transition-colors duration-300',
          labelSizes[size],
          isOnline ? 'text-emerald-400' : 'text-muted-foreground'
        )}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
};

// Re-export scalable hooks for backward compatibility
export { useScalableOnlineStatus as useUserOnlineStatus } from '@/hooks/useScalablePresence';
export { useTrackPresenceScalable as useTrackPresence } from '@/hooks/useScalablePresence';
