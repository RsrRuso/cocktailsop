import { useState, useEffect, useRef } from 'react';
import { Skeleton } from './ui/skeleton';

interface LazyVideoProps {
  src: string;
  className?: string;
  muted?: boolean;
  onClick?: () => void;
}

export const LazyVideo = ({ src, className, muted = true, onClick }: LazyVideoProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
          // Only play when >50% visible
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            setShouldPlay(true);
          } else {
            setShouldPlay(false);
          }
        });
      },
      { 
        rootMargin: '100px',
        threshold: [0, 0.5, 1]
      }
    );

    observer.observe(videoRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    
    if (shouldPlay && isLoaded) {
      videoRef.current.play().catch(() => {
        // Autoplay failed, likely due to browser policy
      });
    } else {
      videoRef.current.pause();
    }
  }, [shouldPlay, isLoaded]);

  return (
    <>
      {!isLoaded && <Skeleton className={className} />}
      <video
        ref={videoRef}
        src={isInView ? src : undefined}
        loop
        playsInline
        muted={muted}
        preload="metadata"
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoadedData={() => setIsLoaded(true)}
        onClick={onClick}
      />
    </>
  );
};
