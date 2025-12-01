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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-4">Trim Video</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Start: {formatTime(videoState.trimStart)}</span>
              <span>End: {formatTime(videoState.trimEnd)}</span>
            </div>
            <Slider
              value={[videoState.trimStart, videoState.trimEnd]}
              min={0}
              max={videoState.duration || 100}
              step={0.1}
              onValueChange={([start, end]) => {
                onUpdate({ trimStart: start, trimEnd: end });
              }}
              className="mb-2"
            />
          </div>

          <div>
            <label className="text-sm mb-2 block">Playback Position</label>
            <Slider
              value={[videoState.currentTime]}
              min={videoState.trimStart}
              max={videoState.trimEnd}
              step={0.1}
              onValueChange={([time]) => onUpdate({ currentTime: time })}
            />
            <div className="text-xs text-muted-foreground mt-1">
              {formatTime(videoState.currentTime)} / {formatTime(videoState.duration)}
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => onUpdate({ isPlaying: !videoState.isPlaying })}
          >
            {videoState.isPlaying ? (
              <><Pause className="w-4 h-4" /> Pause</>
            ) : (
              <><Play className="w-4 h-4" /> Play</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
