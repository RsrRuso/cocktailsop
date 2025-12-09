import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { 
  Music, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Repeat,
  SkipBack,
  X
} from "lucide-react";
import { motion } from "framer-motion";

interface MusicTrack {
  id: string;
  title: string;
  preview_url: string | null;
  original_url: string | null;
  duration_sec: number | null;
  profiles?: {
    username: string;
  };
}

interface MusicEditorProps {
  track: MusicTrack;
  onClose: () => void;
  onSave: (settings: MusicSettings) => void;
  initialSettings?: MusicSettings;
}

export interface MusicSettings {
  trackId: string;
  volume: number;
  trimStart: number;
  trimEnd: number;
  fadeIn: boolean;
  fadeOut: boolean;
  loop: boolean;
}

export default function MusicEditor({
  track,
  onClose,
  onSave,
  initialSettings
}: MusicEditorProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(track.duration_sec || 30);
  
  // Settings state
  const [volume, setVolume] = useState(initialSettings?.volume ?? 80);
  const [trimStart, setTrimStart] = useState(initialSettings?.trimStart ?? 0);
  const [trimEnd, setTrimEnd] = useState(initialSettings?.trimEnd ?? duration);
  const [fadeIn, setFadeIn] = useState(initialSettings?.fadeIn ?? false);
  const [fadeOut, setFadeOut] = useState(initialSettings?.fadeOut ?? true);
  const [loop, setLoop] = useState(initialSettings?.loop ?? false);

  const audioUrl = track.preview_url || track.original_url;

  useEffect(() => {
    if (!audioUrl) return;

    audioRef.current = new Audio(audioUrl);
    audioRef.current.volume = volume / 100;

    audioRef.current.onloadedmetadata = () => {
      if (audioRef.current) {
        const dur = audioRef.current.duration;
        setDuration(dur);
        if (!initialSettings?.trimEnd) {
          setTrimEnd(Math.min(dur, 30)); // Default max 30 sec
        }
      }
    };

    audioRef.current.ontimeupdate = () => {
      if (audioRef.current) {
        const time = audioRef.current.currentTime;
        setCurrentTime(time);
        
        // Check if we've reached trim end
        if (time >= trimEnd) {
          if (loop) {
            audioRef.current.currentTime = trimStart;
          } else {
            audioRef.current.pause();
            setIsPlaying(false);
          }
        }
      }
    };

    audioRef.current.onended = () => {
      if (loop) {
        audioRef.current!.currentTime = trimStart;
        audioRef.current!.play();
      } else {
        setIsPlaying(false);
      }
    };

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [audioUrl]);

  // Update volume when slider changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.currentTime = trimStart;
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = trimStart;
      setCurrentTime(trimStart);
    }
  };

  const handleSave = () => {
    audioRef.current?.pause();
    onSave({
      trackId: track.id,
      volume: volume / 100,
      trimStart,
      trimEnd,
      fadeIn,
      fadeOut,
      loop
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const trimDuration = trimEnd - trimStart;

  return (
    <Card className="p-4 bg-card/95 backdrop-blur-lg border-border/50 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Music className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-sm">{track.title}</h3>
            <p className="text-xs text-muted-foreground">
              @{track.profiles?.username || "unknown"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Waveform / Timeline */}
      <div className="space-y-2">
        <div className="relative h-12 bg-muted/50 rounded-lg overflow-hidden">
          {/* Trim region */}
          <div 
            className="absolute top-0 bottom-0 bg-primary/20"
            style={{
              left: `${(trimStart / duration) * 100}%`,
              width: `${((trimEnd - trimStart) / duration) * 100}%`
            }}
          />
          
          {/* Playhead */}
          <motion.div 
            className="absolute top-0 bottom-0 w-0.5 bg-primary"
            style={{
              left: `${(currentTime / duration) * 100}%`
            }}
          />

          {/* Fake waveform bars */}
          <div className="absolute inset-0 flex items-center justify-center gap-0.5 px-2">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-foreground/20 rounded-full"
                style={{ height: `${20 + Math.random() * 60}%` }}
              />
            ))}
          </div>
        </div>

        {/* Time display */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>Clip: {formatTime(trimDuration)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Trim controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Trim Range</Label>
          <span className="text-xs text-muted-foreground">
            {formatTime(trimStart)} - {formatTime(trimEnd)}
          </span>
        </div>
        <div className="px-1">
          <Slider
            value={[trimStart, trimEnd]}
            min={0}
            max={duration}
            step={0.1}
            onValueChange={([start, end]) => {
              setTrimStart(start);
              setTrimEnd(end);
            }}
            className="w-full"
          />
        </div>
      </div>

      {/* Volume control */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm flex items-center gap-2">
            {volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            Volume
          </Label>
          <span className="text-xs text-muted-foreground">{volume}%</span>
        </div>
        <Slider
          value={[volume]}
          min={0}
          max={100}
          step={1}
          onValueChange={([val]) => setVolume(val)}
        />
      </div>

      {/* Toggle options */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Fade In</Label>
          <Switch checked={fadeIn} onCheckedChange={setFadeIn} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm">Fade Out</Label>
          <Switch checked={fadeOut} onCheckedChange={setFadeOut} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm flex items-center gap-1">
            <Repeat className="w-3 h-3" />
            Loop
          </Label>
          <Switch checked={loop} onCheckedChange={setLoop} />
        </div>
      </div>

      {/* Playback controls */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={handleReset}>
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button 
          size="lg" 
          className="w-14 h-14 rounded-full"
          onClick={handlePlayPause}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </Button>
      </div>

      {/* Save button */}
      <Button className="w-full" onClick={handleSave}>
        Apply Music Settings
      </Button>
    </Card>
  );
}
