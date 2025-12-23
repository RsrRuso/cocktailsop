import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { useEffect, useState, memo } from "react";
import StatusRing from "./StatusRing";
import { useUserStatus } from "@/hooks/useUserStatus";

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

  // Only fetch status if explicitly requested
  const { data: status } = useUserStatus(showStatus && userId ? userId : null);

  // If src changes (or initial src arrives late), retry loading
  useEffect(() => {
    setImageError(false);
  }, [src]);

  // Only render image if src exists and no error
  const shouldShowImage = !!src && !imageError;

  const avatar = (
    <Avatar className={className}>
      {shouldShowImage && (
        <AvatarImage
          key={src}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setImageError(true)}
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