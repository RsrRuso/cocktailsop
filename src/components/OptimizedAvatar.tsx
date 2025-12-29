import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { useEffect, useState, memo, useMemo } from "react";
import StatusRing from "./StatusRing";
import { useUserStatus } from "@/hooks/useUserStatus";
import { getCachedAvatar, preloadAvatar, isAvatarPreloaded } from "@/lib/avatarCache";

interface OptimizedAvatarProps {
  src: string | null | undefined;
  alt: string;
  fallback?: string;
  className?: string;
  userId?: string | null;
  showStatus?: boolean;
  showAddButton?: boolean;
  onAddStatusClick?: () => void;
  showOnlineIndicator?: boolean;
}

const OptimizedAvatar = memo(({
  src,
  alt,
  fallback,
  className,
  userId,
  showStatus = false,
  showAddButton = false,
  onAddStatusClick,
  showOnlineIndicator = true,
}: OptimizedAvatarProps) => {
  const [imageError, setImageError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(() => isAvatarPreloaded(src || ''));

  // Only fetch status if explicitly requested
  const { data: status } = useUserStatus(showStatus && userId ? userId : null);

  // Get cached URL or trigger preload
  const cachedSrc = useMemo(() => {
    if (!src) return null;
    const cached = getCachedAvatar(src);
    if (cached) return cached;
    // Trigger background preload
    preloadAvatar(src).then(() => setIsLoaded(true));
    return src;
  }, [src]);

  // If src changes, reset states
  useEffect(() => {
    setImageError(false);
    setIsLoaded(isAvatarPreloaded(src || ''));
  }, [src]);

  // Only render image if src exists and no error
  const shouldShowImage = !!cachedSrc && !imageError;

  const avatar = (
    <Avatar className={className}>
      {shouldShowImage && (
        <AvatarImage
          key={cachedSrc}
          src={cachedSrc}
          alt={alt}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={() => setIsLoaded(true)}
          onError={() => setImageError(true)}
          style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 0.15s' }}
        />
      )}
      <AvatarFallback>{fallback || <User className="w-4 h-4" />}</AvatarFallback>
    </Avatar>
  );

  // Simple render without birthday overhead
  return (
    <StatusRing 
      hasStatus={!!status}
      status={status}
      showAddButton={showAddButton}
      onAddClick={onAddStatusClick}
      username={alt}
      avatarUrl={src || undefined}
      userId={userId}
      showOnlineIndicator={showOnlineIndicator}
    >
      {avatar}
    </StatusRing>
  );
});

OptimizedAvatar.displayName = 'OptimizedAvatar';

export default OptimizedAvatar;