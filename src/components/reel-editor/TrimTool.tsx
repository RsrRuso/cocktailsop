import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { VideoState } from '@/hooks/useVideoEditor';
import { Play, Pause } from 'lucide-react';

interface TrimToolProps {
  videoState: VideoState;
  onUpdate: (updates: Partial<VideoState>) => void;
}

export function TrimTool({ videoState, onUpdate }: TrimToolProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayPause = () => {
    onUpdate({ isPlaying: !videoState.isPlaying });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-4">Trim & Playback</h3>
        
        <div className="space-y-4">
          {/* Play/Pause Control */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={togglePlayPause}
          >
            {videoState.isPlaying ? (
              <><Pause className="w-4 h-4" /> Pause</>
            ) : (
              <><Play className="w-4 h-4" /> Play</>
            )}
          </Button>

          <div>
            <label className="text-sm mb-2 block font-medium">Current Time</label>
            <div className="text-center py-2 px-4 bg-muted rounded-lg font-mono">
              {formatTime(videoState.currentTime)} / {formatTime(videoState.duration)}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Trim Start: {formatTime(videoState.trimStart)}</span>
              <span>Trim End: {formatTime(videoState.trimEnd)}</span>
            </div>
            <Slider
              value={[videoState.trimStart, videoState.trimEnd]}
              min={0}
              max={videoState.duration || 100}
              step={0.1}
              onValueChange={([start, end]) => {
                onUpdate({ trimStart: start, trimEnd: end });
              }}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Drag to set start and end points for your video
            </p>
          </div>

          <div>
            <label className="text-sm mb-2 block">Seek Position</label>
            <Slider
              value={[videoState.currentTime]}
              min={0}
              max={videoState.duration || 100}
              step={0.1}
              onValueChange={([time]) => onUpdate({ currentTime: time })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
