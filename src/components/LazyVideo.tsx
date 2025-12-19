import { useState, useEffect, useRef } from 'react';
import { Skeleton } from './ui/skeleton';
import { Loader2 } from 'lucide-react';

interface LazyVideoProps {
  src: string;
  className?: string;
  muted?: boolean;
  onClick?: () => void;
  onVisibilityChange?: (isVisible: boolean) => void;
  poster?: string;
}

export const LazyVideo = ({ src, className, muted = true, onClick, onVisibilityChange, poster }: LazyVideoProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Generate a poster from the video URL if not provided
  const videoPoster = poster || (src ? `${src}#t=0.1` : undefined);

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
        rootMargin: '100px',
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
    <div className={`relative ${className}`} style={{ backgroundColor: 'transparent' }}>
      {/* Loading state - only show spinner, keep transparent */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
        </div>
      )}
      
      <video
        ref={videoRef}
        src={src}
        loop
        playsInline
        muted={muted}
        autoPlay
        preload="auto"
        poster={videoPoster}
        className="w-full h-full object-cover"
        onLoadedData={() => setIsLoaded(true)}
        onCanPlay={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        onClick={onClick}
        style={{ backgroundColor: 'transparent' }}
      />
    </div>
  );
};
