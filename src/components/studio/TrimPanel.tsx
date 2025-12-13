import { useState, useEffect, useRef } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface TrimPanelProps {
  duration: number;
  trimStart: number;
  trimEnd: number;
  onTrimChange: (start: number, end: number) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export function TrimPanel({ duration, trimStart, trimEnd, onTrimChange, videoRef }: TrimPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      // Loop within trim range during preview
      if (video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [trimStart, trimEnd, videoRef]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.currentTime = trimStart;
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const resetTrim = () => {
    onTrimChange(0, duration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const trimDuration = trimEnd - trimStart;

  return (
    <div className="p-4 space-y-4 bg-card rounded-xl border border-border/40">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Trim Video</h3>
        <Button variant="ghost" size="sm" onClick={resetTrim}>
          <RotateCcw className="w-4 h-4 mr-1" />
          Reset
        </Button>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        <div className="relative h-12 bg-muted rounded-lg overflow-hidden">
          {/* Trim range indicator */}
          <div 
            className="absolute h-full bg-primary/30"
            style={{
              left: `${(trimStart / duration) * 100}%`,
              width: `${((trimEnd - trimStart) / duration) * 100}%`,
            }}
          />
          
          {/* Current time indicator */}
          <div 
            className="absolute w-0.5 h-full bg-primary"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        {/* Range slider */}
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground w-16">Start</span>
            <Slider
              value={[trimStart]}
              min={0}
              max={trimEnd - 0.5}
              step={0.1}
              onValueChange={([val]) => onTrimChange(val, trimEnd)}
              className="flex-1"
            />
            <span className="text-xs font-mono w-12">{formatTime(trimStart)}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground w-16">End</span>
            <Slider
              value={[trimEnd]}
              min={trimStart + 0.5}
              max={duration}
              step={0.1}
              onValueChange={([val]) => onTrimChange(trimStart, val)}
              className="flex-1"
            />
            <span className="text-xs font-mono w-12">{formatTime(trimEnd)}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={togglePlay}>
          {isPlaying ? (
            <Pause className="w-4 h-4 mr-1" />
          ) : (
            <Play className="w-4 h-4 mr-1" />
          )}
          Preview
        </Button>
        
        <div className="text-sm text-muted-foreground">
          Duration: <span className="font-mono">{formatTime(trimDuration)}</span>
        </div>
      </div>
    </div>
  );
}
