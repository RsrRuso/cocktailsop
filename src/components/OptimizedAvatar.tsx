import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { useState } from "react";
import StatusRing from "./StatusRing";
import { useUserStatus } from "@/hooks/useUserStatus";
import BirthdayFireworks from "./BirthdayFireworks";
import { useUserBirthday } from "@/hooks/useUserBirthday";
import BirthdayBadge from "./BirthdayBadge";

interface OptimizedAvatarProps {
  src: string | null | undefined;
  alt: string;
  fallback?: string;
  className?: string;
  userId?: string | null;
  showStatus?: boolean;
  showAddButton?: boolean;
  onAddStatusClick?: () => void;
  showBirthdayBadge?: boolean;
}

const OptimizedAvatar = ({ 
  src, 
  alt, 
  fallback, 
  className,
  userId,
  showStatus = true,
  showAddButton = false,
  onAddStatusClick
}: OptimizedAvatarProps) => {
  const [imageError, setImageError] = useState(false);
  const { data: status } = useUserStatus(showStatus ? userId : null);
  const { data: birthdayData } = useUserBirthday(userId);

  // Only render image if src exists and no error
  const shouldShowImage = src && !imageError;

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
    <BirthdayFireworks isBirthday={birthdayData?.isBirthday || false}>
      <StatusRing 
        hasStatus={!!status}
        statusText={status?.status_text}
        emoji={status?.emoji}
        showAddButton={showAddButton}
        onAddClick={onAddStatusClick}
      >
        {avatar}
      </StatusRing>
    </BirthdayFireworks>
  );
};

export default OptimizedAvatar;
