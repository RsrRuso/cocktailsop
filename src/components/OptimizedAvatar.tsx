import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { useState } from "react";
import StatusRing from "./StatusRing";
import { useUserStatus } from "@/hooks/useUserStatus";

interface OptimizedAvatarProps {
  src: string | null | undefined;
  alt: string;
  fallback?: string;
  className?: string;
  userId?: string | null;
  showStatus?: boolean;
}

const OptimizedAvatar = ({ 
  src, 
  alt, 
  fallback, 
  className,
  userId,
  showStatus = true 
}: OptimizedAvatarProps) => {
  const [imageError, setImageError] = useState(false);
  const { data: status } = useUserStatus(showStatus ? userId : null);

  // Only render image if src exists and no error
  const shouldShowImage = src && !imageError && !src.startsWith('data:');

  const avatar = (
    <Avatar className={className}>
      {shouldShowImage && (
        <AvatarImage 
          src={src} 
          alt={alt}
          loading="lazy"
          onError={() => setImageError(true)}
        />
      )}
      <AvatarFallback>
        {fallback || <User className="w-4 h-4" />}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <StatusRing hasStatus={!!status}>
      {avatar}
    </StatusRing>
  );
};

export default OptimizedAvatar;
