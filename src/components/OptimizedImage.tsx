import { memo } from 'react';
import { useOptimizedImage } from '@/hooks/useOptimizedImage';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
}

export const OptimizedImage = memo(({ src, alt, className, onLoad }: OptimizedImageProps) => {
  const { imageSrc, isLoading, error } = useOptimizedImage(src);

  if (error) {
    return (
      <div className={cn("bg-muted flex items-center justify-center", className)}>
        <span className="text-muted-foreground text-sm">Failed to load</span>
      </div>
    );
  }

  if (isLoading) {
    return <Skeleton className={className} />;
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={cn("transition-opacity duration-300", className)}
      onLoad={onLoad}
      loading="lazy"
    />
  );
});

OptimizedImage.displayName = 'OptimizedImage';
