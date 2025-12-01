import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { VideoState } from '@/hooks/useVideoEditor';

interface SpeedToolProps {
  videoState: VideoState;
  onUpdate: (updates: Partial<VideoState>) => void;
}

const speedPresets = [
  { label: '0.3x', value: 0.3 },
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '3x', value: 3 },
];

export function SpeedTool({ videoState, onUpdate }: SpeedToolProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-4">Playback Speed</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Speed</span>
              <span>{videoState.playbackSpeed}x</span>
            </div>
            <Slider
              value={[videoState.playbackSpeed]}
              min={0.3}
              max={3}
              step={0.1}
              onValueChange={([speed]) => onUpdate({ playbackSpeed: speed })}
            />
          </div>

          <div className="grid grid-cols-5 gap-2">
            {speedPresets.map((preset) => (
              <Button
                key={preset.value}
                variant={videoState.playbackSpeed === preset.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => onUpdate({ playbackSpeed: preset.value })}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
