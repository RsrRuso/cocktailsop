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
  const [amplitude, setAmplitude] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(audio.duration);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setAmplitude(0);
    });

    // Setup Web Audio API for real-time visualization
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    const source = audioContext.createMediaElementSource(audio);
    sourceRef.current = source;
    
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    return () => {
      audio.pause();
      audio.src = '';
      audioContext.close();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    const updateVisualization = () => {
      if (audioRef.current && isPlaying && analyserRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        
        // Get frequency data
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average amplitude
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalizedAmplitude = average / 255; // Normalize to 0-1
        setAmplitude(normalizedAmplitude);
        
        animationFrameRef.current = requestAnimationFrame(updateVisualization);
      } else if (!isPlaying) {
        setAmplitude(0);
      }
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateVisualization);
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
    if (!audioRef.current || !audioContextRef.current) return;

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate line height based on amplitude (20% to 100% of container)
  const lineHeight = isPlaying ? `${20 + amplitude * 80}%` : '30%';

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

      {/* Single Vibrating Line */}
      <div className="flex-1 flex items-center justify-center h-8">
        <div 
          className={`w-full rounded-full transition-all duration-75 ${
            isPlaying ? 'bg-primary shadow-lg shadow-primary/50' : 'bg-muted-foreground/40'
          }`}
          style={{
            height: lineHeight,
            maxHeight: '32px',
            transform: isPlaying ? `scaleY(${1 + amplitude * 0.5})` : 'scaleY(1)',
            transition: 'height 0.05s ease-out, transform 0.05s ease-out',
          }}
        />
      </div>

      {/* Time Display */}
      <span className="text-[10px] text-muted-foreground/70 shrink-0 min-w-[32px] text-right">
        {formatTime(isPlaying ? currentTime : audioDuration)}
      </span>
    </div>
  );
};
