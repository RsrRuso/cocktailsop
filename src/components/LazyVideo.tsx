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
          // Play when any part is visible
          if (entry.isIntersecting) {
            setShouldPlay(true);
          } else {
            setShouldPlay(false);
          }
        });
      },
      { 
        rootMargin: '0px',
        threshold: 0.1
      }
    );

    observer.observe(videoRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    
    if (shouldPlay && isLoaded) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log('Autoplay prevented:', error);
          // Autoplay was prevented, video will play when user interacts
        });
      }
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0; // Reset to start when out of view
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
        autoPlay
        preload="auto"
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoadedData={() => setIsLoaded(true)}
        onClick={onClick}
      />
    </>
  );
};
