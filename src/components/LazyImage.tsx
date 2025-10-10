import { useState, useEffect, useRef } from 'react';
import { Skeleton } from './ui/skeleton';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
}

export const LazyImage = ({ src, alt, className, onLoad }: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' } // Load 50px before image enters viewport
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {!isLoaded && (
        <Skeleton className={className} />
      )}
      <img
        ref={imgRef}
        src={isInView ? src : undefined}
        alt={alt}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => {
          setIsLoaded(true);
          onLoad?.();
        }}
        loading="lazy"
      />
    </>
  );
};
