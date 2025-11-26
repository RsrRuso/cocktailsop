import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from './ui/button';

interface VoiceWaveformProps {
  audioUrl: string;
  duration?: number;
}

export const VoiceWaveform = ({ audioUrl, duration }: VoiceWaveformProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number>();

  // Generate waveform bars (simplified visualization)
  useEffect(() => {
    // Generate 40 bars with random heights for visual effect
    const bars = Array.from({ length: 40 }, () => Math.random() * 0.7 + 0.3);
    setWaveformData(bars);
  }, [audioUrl]);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(audio.duration);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      audio.pause();
      audio.src = '';
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    const updateTime = () => {
      if (audioRef.current && isPlaying) {
        setCurrentTime(audioRef.current.currentTime);
        animationFrameRef.current = requestAnimationFrame(updateTime);
      }
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleWaveformClick = (index: number) => {
    if (!audioRef.current || audioDuration === 0) return;

    const clickPosition = index / waveformData.length;
    const newTime = clickPosition * audioDuration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? currentTime / audioDuration : 0;

  return (
    <div className="flex items-center gap-3 min-w-[240px] max-w-md">
      {/* Play/Pause Button */}
      <Button
        size="icon"
        variant="ghost"
        onClick={togglePlayPause}
        className="h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20 hover:scale-105 transition-all shrink-0"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 text-primary" fill="currentColor" />
        ) : (
          <Play className="h-4 w-4 text-primary ml-0.5" fill="currentColor" />
        )}
      </Button>

      {/* Animated Waveform Lines */}
      <div className="flex-1 flex items-center gap-1 h-8">
        {waveformData.map((height, index) => {
          const isPast = index / waveformData.length < progress;
          const isNearPlayhead = isPlaying && Math.abs(index / waveformData.length - progress) < 0.08;
          
          return (
            <button
              key={index}
              onClick={() => handleWaveformClick(index)}
              className="flex-1 flex items-center justify-center min-w-[2px] max-w-[3px]"
            >
              <div
                className={`w-full rounded-full transition-all duration-100 ${
                  isPlaying && isPast
                    ? 'bg-primary'
                    : 'bg-muted-foreground/40'
                } ${
                  isNearPlayhead
                    ? 'animate-pulse scale-110'
                    : ''
                }`}
                style={{
                  height: isPlaying && isNearPlayhead 
                    ? `${Math.min(height * 120, 100)}%` 
                    : `${height * 100}%`,
                  maxHeight: '32px',
                  animation: isPlaying && isNearPlayhead 
                    ? 'wave-vibrate 0.3s ease-in-out infinite' 
                    : 'none',
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Time Display */}
      <span className="text-[10px] text-muted-foreground/70 shrink-0 min-w-[32px] text-right">
        {formatTime(isPlaying ? currentTime : audioDuration)}
      </span>
      
      <style>{`
        @keyframes wave-vibrate {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.2); }
        }
      `}</style>
    </div>
  );
};
