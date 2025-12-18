import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { AudioSettings } from '@/hooks/useVideoEditor';
import { Music, Mic, Volume2, VolumeX, Camera, X, Plus } from 'lucide-react';
import MusicSelectionDialog from '@/components/MusicSelectionDialog';
import { cn } from '@/lib/utils';

interface AudioToolProps {
  audioSettings: AudioSettings;
  onUpdate: (updates: Partial<AudioSettings>) => void;
}

// Generate fake waveform data for visualization
const generateWaveform = (length: number = 50) => {
  return Array.from({ length }, () => Math.random() * 0.8 + 0.2);
};

interface AudioTrackProps {
  label: string;
  icon: React.ReactNode;
  volume: number;
  onVolumeChange: (value: number) => void;
  color: string;
  isActive?: boolean;
  onRemove?: () => void;
  showRemove?: boolean;
}

function AudioTrack({ 
  label, 
  icon, 
  volume, 
  onVolumeChange, 
  color,
  isActive = true,
  onRemove,
  showRemove = false
}: AudioTrackProps) {
  const [waveform] = useState(() => generateWaveform(40));
  const isMuted = volume === 0;

  return (
    <div className={cn(
      "rounded-2xl p-4 transition-all duration-200",
      isActive ? "bg-card/80 border border-border" : "bg-muted/30 opacity-60"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            color
          )}>
            {icon}
          </div>
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onVolumeChange(isMuted ? 0.5 : 0)}
            className="p-1.5 rounded-full hover:bg-muted/50 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Volume2 className="w-4 h-4 text-foreground" />
            )}
          </button>
          {showRemove && onRemove && (
            <button
              onClick={onRemove}
              className="p-1.5 rounded-full hover:bg-destructive/10 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
            </button>
          )}
        </div>
      </div>

      {/* Waveform Visualization */}
      <div className="relative h-12 mb-3 bg-muted/30 rounded-xl overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center gap-[2px] px-2">
          {waveform.map((height, i) => (
            <div
              key={i}
              className={cn(
                "w-1 rounded-full transition-all duration-150",
                isMuted ? "bg-muted-foreground/30" : color.replace('bg-', 'bg-').replace('/20', '')
              )}
              style={{
                height: `${height * volume * 100}%`,
                minHeight: '4px',
                opacity: isMuted ? 0.3 : 0.7 + (height * 0.3)
              }}
            />
          ))}
        </div>
        
        {/* Playhead indicator */}
        <div className="absolute left-1/3 top-0 bottom-0 w-0.5 bg-white/50" />
      </div>

      {/* Volume Slider */}
      <div className="flex items-center gap-3">
        <VolumeX className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <Slider
          value={[volume]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={([val]) => onVolumeChange(val)}
          className="flex-1"
        />
        <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-xs text-muted-foreground w-8 text-right">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
}

export function AudioTool({ audioSettings, onUpdate }: AudioToolProps) {
  const [showMusicDialog, setShowMusicDialog] = useState(false);
  const [selectedTrackName, setSelectedTrackName] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Audio Mixer</h3>
        <span className="text-xs text-muted-foreground">Adjust volumes</span>
      </div>

      {/* Audio Tracks */}
      <div className="space-y-3">
        {/* Camera/Original Audio */}
        <AudioTrack
          label="Camera audio"
          icon={<Camera className="w-4 h-4 text-white" />}
          volume={audioSettings.originalAudioVolume}
          onVolumeChange={(val) => onUpdate({ originalAudioVolume: val })}
          color="bg-blue-500/20"
        />

        {/* Added Music */}
        {audioSettings.musicUrl ? (
          <AudioTrack
            label={selectedTrackName || "Added audio"}
            icon={<Music className="w-4 h-4 text-white" />}
            volume={audioSettings.musicVolume}
            onVolumeChange={(val) => onUpdate({ musicVolume: val })}
            color="bg-pink-500/20"
            showRemove
            onRemove={() => {
              onUpdate({ musicUrl: null });
              setSelectedTrackName(null);
            }}
          />
        ) : (
          <button
            onClick={() => setShowMusicDialog(true)}
            className="w-full rounded-2xl border-2 border-dashed border-muted-foreground/30 p-4 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">Add music</span>
          </button>
        )}

        {/* Voiceover */}
        {audioSettings.voiceoverUrl ? (
          <AudioTrack
            label="Voiceover"
            icon={<Mic className="w-4 h-4 text-white" />}
            volume={audioSettings.voiceoverVolume}
            onVolumeChange={(val) => onUpdate({ voiceoverVolume: val })}
            color="bg-green-500/20"
            showRemove
            onRemove={() => onUpdate({ voiceoverUrl: null })}
          />
        ) : (
          <button
            onClick={() => {/* TODO: Implement voiceover recording */}}
            className="w-full rounded-2xl border-2 border-dashed border-muted-foreground/30 p-4 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-all duration-200"
          >
            <Mic className="w-5 h-5" />
            <span className="text-sm font-medium">Record voiceover</span>
          </button>
        )}
      </div>

      {/* Quick Mix Presets */}
      <div className="pt-2">
        <p className="text-xs text-muted-foreground mb-2">Quick presets</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => {
              onUpdate({ originalAudioVolume: 1, musicVolume: 0 });
            }}
          >
            Original only
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => {
              onUpdate({ originalAudioVolume: 0, musicVolume: 1 });
            }}
          >
            Music only
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => {
              onUpdate({ originalAudioVolume: 0.5, musicVolume: 0.5 });
            }}
          >
            Mix 50/50
          </Button>
        </div>
      </div>

      <MusicSelectionDialog
        open={showMusicDialog}
        onOpenChange={setShowMusicDialog}
        onSelect={(track) => {
          onUpdate({ musicUrl: track.preview_url });
          setSelectedTrackName(track.title);
          setShowMusicDialog(false);
        }}
      />
    </div>
  );
}
