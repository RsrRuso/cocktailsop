import { useState, useEffect, useRef, useCallback } from 'react';
import { Skeleton } from './ui/skeleton';

interface LazyVideoProps {
  src: string;
  className?: string;
  muted?: boolean;
  onClick?: () => void;
  onVisibilityChange?: (isVisible: boolean) => void;
}

export const LazyVideo = ({ src, className, muted = true, onClick, onVisibilityChange }: LazyVideoProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const visible = entry.isIntersecting && entry.intersectionRatio > 0.5;
          setIsInView(visible);
          onVisibilityChange?.(visible);
        });
      },
      { 
        rootMargin: '0px',
        threshold: [0, 0.5, 1]
      }
    );

    observer.observe(videoRef.current);

    return () => observer.disconnect();
  }, [onVisibilityChange]);

  // Handle play/pause based on visibility
  useEffect(() => {
    if (!videoRef.current || !isLoaded) return;
    
    if (isInView) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isInView, isLoaded]);

  // Handle muted prop changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  return (
    <>
      {!isLoaded && <Skeleton className={className} />}
      <video
        ref={videoRef}
        src={isInView ? src : undefined}
        loop
        playsInline
        muted={muted}
        autoPlay
        preload="auto"
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoadedData={() => setIsLoaded(true)}
        onClick={onClick}
      />
    </>
  );
};
