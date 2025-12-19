import { useState, useEffect, useRef, memo } from 'react';

interface InstagramImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'auto';
  priority?: boolean;
}

/**
 * Instagram-style image component with:
 * - Blur-up placeholder effect
 * - Native lazy loading
 * - Async decoding
 * - Content-visibility optimization
 * - Hardware-accelerated transitions
 */
export const InstagramImage = memo(({ 
  src, 
  alt, 
  className = '',
  aspectRatio = 'auto',
  priority = false
}: InstagramImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Aspect ratio classes
  const aspectClasses = {
    square: 'aspect-square',
    portrait: 'aspect-[4/5]',
    landscape: 'aspect-video',
    auto: ''
  };

  // Intersection observer for lazy loading
  useEffect(() => {
    if (priority || !containerRef.current) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: '200px', // Preload 200px before entering viewport
        threshold: 0 
      }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [priority]);

  // Dominant color placeholder (Instagram uses this)
  const placeholderColor = 'hsl(var(--muted))';

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${aspectClasses[aspectRatio]} ${className}`}
      style={{
        backgroundColor: placeholderColor,
        contentVisibility: 'auto',
        containIntrinsicSize: '0 400px', // Estimated height for layout
      }}
    >
      {/* Blur placeholder - simulates Instagram's blur-up effect */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 animate-pulse"
          style={{
            background: `linear-gradient(135deg, ${placeholderColor} 0%, hsl(var(--muted-foreground) / 0.1) 50%, ${placeholderColor} 100%)`,
            backgroundSize: '200% 200%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
        />
      )}

      {/* Actual image */}
      {isInView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setIsLoaded(true)}
          className={`
            w-full h-full object-cover
            transition-opacity duration-300 ease-out
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          style={{
            willChange: isLoaded ? 'auto' : 'opacity',
            transform: 'translateZ(0)', // Force GPU layer
          }}
        />
      )}
    </div>
  );
});

InstagramImage.displayName = 'InstagramImage';
