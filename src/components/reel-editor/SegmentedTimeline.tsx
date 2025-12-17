import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface SegmentedTimelineProps {
  currentTime: number;
  duration: number;
  clipDuration: number;
  onSeek: (time: number) => void;
  thumbnailUrl?: string;
  isVideo?: boolean;
}

export function SegmentedTimeline({
  currentTime,
  duration,
  clipDuration,
  onSeek,
  thumbnailUrl,
  isVideo = true
}: SegmentedTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const maxDuration = Math.min(duration, clipDuration);
  const segmentCount = 30; // Number of segments like Instagram
  const segmentWidth = 100 / segmentCount;
  const progressPercentage = maxDuration > 0 ? (currentTime / maxDuration) * 100 : 0;
  
  const handleInteraction = useCallback((clientX: number) => {
    if (!containerRef.current || maxDuration <= 0) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = clickX / rect.width;
    const newTime = percentage * maxDuration;
    onSeek(Math.max(0, Math.min(newTime, maxDuration)));
  }, [maxDuration, onSeek]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleInteraction(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleInteraction(e.clientX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    handleInteraction(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      handleInteraction(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div className="w-full px-4 py-2">
      {/* Segmented Progress Bar */}
      <div
        ref={containerRef}
        className="relative h-2 flex gap-[1px] cursor-pointer touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {Array.from({ length: segmentCount }).map((_, index) => {
          const segmentStart = (index / segmentCount) * 100;
          const segmentEnd = ((index + 1) / segmentCount) * 100;
          const isFilled = progressPercentage >= segmentEnd;
          const isPartial = progressPercentage > segmentStart && progressPercentage < segmentEnd;
          const partialFill = isPartial 
            ? ((progressPercentage - segmentStart) / (segmentEnd - segmentStart)) * 100 
            : 0;

          return (
            <div
              key={index}
              className="flex-1 h-full rounded-[2px] overflow-hidden bg-white/20 relative"
            >
              {isFilled && (
                <div className="absolute inset-0 bg-amber-400" />
              )}
              {isPartial && (
                <div 
                  className="absolute inset-y-0 left-0 bg-amber-400 transition-all duration-75"
                  style={{ width: `${partialFill}%` }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Thumbnail Strip */}
      <div className="mt-3 relative">
        <div className="flex gap-0.5 overflow-hidden rounded-lg h-12">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex-1 h-full overflow-hidden bg-white/5">
              {thumbnailUrl && (
                isVideo ? (
                  <video 
                    src={thumbnailUrl} 
                    className="w-full h-full object-cover opacity-70"
                    muted 
                  />
                ) : (
                  <img 
                    src={thumbnailUrl} 
                    alt="" 
                    className="w-full h-full object-cover opacity-70" 
                  />
                )
              )}
            </div>
          ))}
        </div>
        
        {/* Playhead Indicator */}
        <motion.div 
          className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-10"
          animate={{ 
            left: `${progressPercentage}%`
          }}
          transition={{ type: 'tween', ease: 'linear', duration: isDragging ? 0 : 0.05 }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
        </motion.div>
      </div>
    </div>
  );
}
