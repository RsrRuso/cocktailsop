import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { useState } from "react";

interface OptimizedAvatarProps {
  src: string | null | undefined;
  alt: string;
  fallback?: string;
  className?: string;
}

const OptimizedAvatar = ({ src, alt, fallback, className }: OptimizedAvatarProps) => {
  const [imageError, setImageError] = useState(false);

  // Only render image if src exists and no error
  const shouldShowImage = src && !imageError && !src.startsWith('data:');

  return (
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
};

export default OptimizedAvatar;
