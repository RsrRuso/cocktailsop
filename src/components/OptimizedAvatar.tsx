import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { useEffect, useState, memo, useLayoutEffect } from "react";
import StatusRing from "./StatusRing";
import { useUserStatus } from "@/hooks/useUserStatus";
import { getCachedAvatar, preloadAvatar, isAvatarPreloaded, markAvatarLoaded } from "@/lib/avatarCache";

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
  // Start with loaded=true if already cached for instant display
  const [isLoaded, setIsLoaded] = useState(() => {
    if (!src) return true;
    return isAvatarPreloaded(src);
  });

  // Only fetch status if explicitly requested
  const { data: status } = useUserStatus(showStatus && userId ? userId : null);

  // Get cached URL - use synchronous check first
  const cachedSrc = src ? (getCachedAvatar(src) || src) : null;

  // Preload immediately on mount using useLayoutEffect for sync behavior
  useLayoutEffect(() => {
    if (!src) return;
    
    if (isAvatarPreloaded(src)) {
      setIsLoaded(true);
      return;
    }

    // Start preloading immediately
    preloadAvatar(src).then(() => {
      setIsLoaded(true);
    });
  }, [src]);

  // Reset error state when src changes
  useEffect(() => {
    setImageError(false);
  }, [src]);

  // Only render image if src exists and no error
  const shouldShowImage = !!cachedSrc && !imageError;

  const handleImageLoad = () => {
    setIsLoaded(true);
    if (src) markAvatarLoaded(src);
  };

  const avatar = (
    <Avatar className={className}>
      {shouldShowImage && (
        <AvatarImage
          key={cachedSrc}
          src={cachedSrc}
          alt={alt}
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          onLoad={handleImageLoad}
          onError={() => setImageError(true)}
          className={isLoaded ? 'opacity-100' : 'opacity-0'}
          style={{ transition: 'opacity 0.1s ease-out' }}
        />
      )}
      <AvatarFallback className={isLoaded ? 'hidden' : ''}>
        {fallback || <User className="w-4 h-4" />}
      </AvatarFallback>
    </Avatar>
  );

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