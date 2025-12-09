import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Scissors, Music, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface AdvancedVideoTrimmerProps {
  videoUrl: string;
  musicUrl?: string;
  musicName?: string;
  duration: number;
  onTrimChange: (start: number, end: number) => void;
  onMusicTrimChange?: (start: number, end: number) => void;
  trimStart: number;
  trimEnd: number;
  musicTrimStart?: number;
  musicTrimEnd?: number;
  maxDuration?: number;
}

export const AdvancedVideoTrimmer = ({
  videoUrl,
  musicUrl,
  musicName,
  duration,
  onTrimChange,
  onMusicTrimChange,
  trimStart,
  trimEnd,
  musicTrimStart = 0,
  musicTrimEnd = 45,
  maxDuration = 60,
}: AdvancedVideoTrimmerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(trimStart);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'musicStart' | 'musicEnd' | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [showSync, setShowSync] = useState(false);

  // Generate video thumbnails
  useEffect(() => {
    const generateThumbnails = async () => {
      if (!videoUrl) return;
      
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const thumbCount = 10;
      const interval = video.duration / thumbCount;
      const thumbs: string[] = [];
      
      canvas.width = 60;
      canvas.height = 100;
      
      for (let i = 0; i < thumbCount; i++) {
        video.currentTime = i * interval;
        await new Promise((resolve) => {
          video.onseeked = resolve;
        });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        thumbs.push(canvas.toDataURL('image/jpeg', 0.5));
      }
      
      setThumbnails(thumbs);
    };
    
    generateThumbnails().catch(console.error);
  }, [videoUrl]);

  // Sync playback
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      // Loop within trim range
      if (video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
        if (audio && musicUrl) {
          audio.currentTime = musicTrimStart;
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [trimStart, trimEnd, musicUrl, musicTrimStart]);

  // Sync audio with video
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio || !musicUrl) return;

    if (isPlaying) {
      // Calculate offset for music sync
      const videoProgress = (video.currentTime - trimStart) / (trimEnd - trimStart);
      const musicTime = musicTrimStart + videoProgress * (musicTrimEnd - musicTrimStart);
      audio.currentTime = musicTime;
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [isPlaying, musicUrl, trimStart, trimEnd, musicTrimStart, musicTrimEnd]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
      }
      video.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, trimStart, trimEnd]);

  const handleReset = () => {
    onTrimChange(0, Math.min(duration, maxDuration));
    if (onMusicTrimChange) {
      onMusicTrimChange(0, 45);
    }
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
    setCurrentTime(0);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const getTrimDuration = () => trimEnd - trimStart;

  const handleDragStart = (handle: 'start' | 'end' | 'musicStart' | 'musicEnd') => {
    setIsDragging(handle);
    if (isPlaying) {
      videoRef.current?.pause();
      setIsPlaying(false);
    }
  };

  const handleDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const time = percent * duration;

    if (isDragging === 'start') {
      const newStart = Math.max(0, Math.min(time, trimEnd - 1));
      onTrimChange(newStart, trimEnd);
      if (videoRef.current) videoRef.current.currentTime = newStart;
    } else if (isDragging === 'end') {
      const newEnd = Math.min(duration, Math.max(time, trimStart + 1));
      onTrimChange(trimStart, newEnd);
    } else if (isDragging === 'musicStart' && onMusicTrimChange) {
      const newStart = Math.max(0, Math.min(time, musicTrimEnd - 1));
      onMusicTrimChange(newStart, musicTrimEnd);
    } else if (isDragging === 'musicEnd' && onMusicTrimChange) {
      const newEnd = Math.min(duration, Math.max(time, musicTrimStart + 1));
      onMusicTrimChange(musicTrimStart, newEnd);
    }
  }, [isDragging, duration, trimStart, trimEnd, musicTrimStart, musicTrimEnd, onTrimChange, onMusicTrimChange]);

  const handleDragEnd = () => setIsDragging(null);

  return (
    <div className="bg-black/80 backdrop-blur-xl rounded-2xl p-4 space-y-4">
      {/* Preview */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          muted={isMuted || !!musicUrl}
          playsInline
        />
        
        {/* Play overlay */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
        >
          <motion.div
            initial={false}
            animate={{ scale: isPlaying ? 0.8 : 1 }}
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" />
            )}
          </motion.div>
        </button>

        {/* Time display */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <span className="text-white text-xs bg-black/50 px-2 py-1 rounded">
            {formatTime(currentTime)}
          </span>
          <span className="text-white text-xs bg-primary/80 px-2 py-1 rounded">
            {formatTime(getTrimDuration())} clip
          </span>
        </div>
      </div>

      {musicUrl && (
        <audio ref={audioRef} src={musicUrl} muted={isMuted} />
      )}

      {/* Video Timeline with Thumbnails */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-white/70 text-xs flex items-center gap-1">
            <Scissors className="w-3 h-3" />
            Video Trim
          </span>
          <span className="text-primary text-xs">{formatTime(getTrimDuration())}</span>
        </div>
        
        <div
          ref={containerRef}
          className="relative h-16 rounded-lg overflow-hidden cursor-pointer"
          onMouseMove={isDragging ? handleDrag : undefined}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchMove={isDragging ? handleDrag : undefined}
          onTouchEnd={handleDragEnd}
        >
          {/* Thumbnail strip */}
          <div className="absolute inset-0 flex">
            {thumbnails.length > 0 ? (
              thumbnails.map((thumb, i) => (
                <img
                  key={i}
                  src={thumb}
                  alt=""
                  className="h-full flex-1 object-cover opacity-60"
                />
              ))
            ) : (
              <div className="w-full h-full bg-white/10" />
            )}
          </div>

          {/* Trim overlay */}
          <div
            className="absolute inset-y-0 bg-black/60"
            style={{ left: 0, width: `${(trimStart / duration) * 100}%` }}
          />
          <div
            className="absolute inset-y-0 bg-black/60"
            style={{ left: `${(trimEnd / duration) * 100}%`, right: 0 }}
          />

          {/* Active region border */}
          <div
            className="absolute inset-y-0 border-2 border-primary rounded-lg"
            style={{
              left: `${(trimStart / duration) * 100}%`,
              width: `${((trimEnd - trimStart) / duration) * 100}%`,
            }}
          />

          {/* Handles */}
          <motion.div
            className="absolute top-0 bottom-0 w-4 cursor-ew-resize z-10 flex items-center justify-center"
            style={{ left: `calc(${(trimStart / duration) * 100}% - 8px)` }}
            onMouseDown={() => handleDragStart('start')}
            onTouchStart={() => handleDragStart('start')}
            whileHover={{ scale: 1.1 }}
          >
            <div className="w-1.5 h-10 bg-primary rounded-full shadow-lg" />
          </motion.div>
          
          <motion.div
            className="absolute top-0 bottom-0 w-4 cursor-ew-resize z-10 flex items-center justify-center"
            style={{ left: `calc(${(trimEnd / duration) * 100}% - 8px)` }}
            onMouseDown={() => handleDragStart('end')}
            onTouchStart={() => handleDragStart('end')}
            whileHover={{ scale: 1.1 }}
          >
            <div className="w-1.5 h-10 bg-primary rounded-full shadow-lg" />
          </motion.div>

          {/* Playhead */}
          <motion.div
            className="absolute top-0 bottom-0 w-0.5 bg-white z-20 pointer-events-none"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        </div>
      </div>

      {/* Music Sync Timeline */}
      {musicUrl && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-xs flex items-center gap-1">
              <Music className="w-3 h-3" />
              {musicName || 'Music'} Sync
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSync(!showSync)}
              className="text-primary text-xs h-6 px-2"
            >
              {showSync ? 'Hide' : 'Adjust'}
            </Button>
          </div>
          
          {showSync && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 text-xs text-white/60">
                <span>Start: {formatTime(musicTrimStart)}</span>
                <span className="flex-1" />
                <span>End: {formatTime(musicTrimEnd)}</span>
              </div>
              
              <Slider
                value={[musicTrimStart, musicTrimEnd]}
                min={0}
                max={duration}
                step={0.1}
                onValueChange={([start, end]) => {
                  onMusicTrimChange?.(start, end);
                }}
                className="py-2"
              />
              
              <p className="text-center text-white/40 text-xs">
                Drag to sync music with your video
              </p>
            </motion.div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMuted(!isMuted)}
          className="text-white/70 hover:text-white"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-white/70 hover:text-white gap-1"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
};
