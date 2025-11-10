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
    <div className="flex items-center gap-3 min-w-[280px] max-w-md">
      {/* Play/Pause Button */}
      <Button
        size="icon"
        variant="ghost"
        onClick={togglePlayPause}
        className="h-10 w-10 rounded-full glass hover:scale-110 transition-transform shrink-0"
      >
        {isPlaying ? (
          <Pause className="h-5 w-5 text-primary" fill="currentColor" />
        ) : (
          <Play className="h-5 w-5 text-primary" fill="currentColor" />
        )}
      </Button>

      {/* Waveform */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-0.5 h-12 cursor-pointer">
          {waveformData.map((height, index) => {
            const isPast = index / waveformData.length < progress;
            return (
              <button
                key={index}
                onClick={() => handleWaveformClick(index)}
                className="flex-1 flex items-center justify-center group"
                style={{ minWidth: '2px' }}
              >
                <div
                  className={`w-full rounded-full transition-all duration-150 ${
                    isPlaying && isPast
                      ? 'bg-primary glow-primary'
                      : 'bg-muted-foreground/30 group-hover:bg-muted-foreground/50'
                  } ${
                    isPlaying && Math.abs(index / waveformData.length - progress) < 0.05
                      ? 'animate-pulse'
                      : ''
                  }`}
                  style={{
                    height: `${height * 100}%`,
                    maxHeight: '48px',
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* Time Display */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(audioDuration)}</span>
        </div>
      </div>
    </div>
  );
};
