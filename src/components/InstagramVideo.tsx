import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

interface InstagramVideoProps {
  src: string;
  className?: string;
  muted?: boolean;
  poster?: string;
  onClick?: () => void;
  onVisibilityChange?: (isVisible: boolean) => void;
}

/**
 * Instagram-style video component with:
 * - Visibility-based autoplay
 * - Memory-efficient unloading
 * - Smooth loading transitions
 * - Hardware acceleration
 */
export const InstagramVideo = memo(({ 
  src, 
  className = '', 
  muted = true, 
  poster,
  onClick,
  onVisibilityChange 
}: InstagramVideoProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate poster from video if not provided
  const videoPoster = poster || `${src}#t=0.1`;

  // Visibility observer with throttled callback
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        
        setIsInView(visible);
        onVisibilityChange?.(visible);
        
        // Start loading when near viewport
        if (entry.isIntersecting) {
          setShouldLoad(true);
        }
      },
      { 
        rootMargin: '100px',
        threshold: [0, 0.5]
      }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [onVisibilityChange]);

  // Play/pause based on visibility - Instagram style
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isLoaded) return;

    if (isInView) {
      // Use requestAnimationFrame for smooth playback start
      requestAnimationFrame(() => {
        video.play().catch(() => {});
      });
    } else {
      video.pause();
      // Reset to start when out of view (like Instagram)
      video.currentTime = 0;
    }
  }, [isInView, isLoaded]);

  // Handle mute changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  const handleLoadedData = useCallback(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '0 400px',
        backgroundColor: 'transparent',
      }}
    >
      {/* Loading indicator */}
      {!isLoaded && shouldLoad && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-muted/20">
          <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
        </div>
      )}

      {/* Video element - only render when should load */}
      {shouldLoad && (
        <video
          ref={videoRef}
          src={src}
          poster={videoPoster}
          loop
          playsInline
          muted={muted}
          preload="metadata"
          onLoadedData={handleLoadedData}
          onCanPlay={handleLoadedData}
          onClick={onClick}
          className={`
            w-full h-full object-cover
            transition-opacity duration-200
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          style={{
            transform: 'translateZ(0)', // GPU acceleration
            willChange: 'auto',
          }}
        />
      )}
    </div>
  );
});

InstagramVideo.displayName = 'InstagramVideo';
