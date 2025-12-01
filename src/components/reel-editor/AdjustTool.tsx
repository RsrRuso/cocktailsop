import { Slider } from '@/components/ui/slider';
import { Adjustments } from '@/hooks/useVideoEditor';

interface AdjustToolProps {
  adjustments: Adjustments;
  onUpdate: (updates: Partial<Adjustments>) => void;
}

export function AdjustTool({ adjustments, onUpdate }: AdjustToolProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-4">Adjustments</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Brightness</span>
              <span>{adjustments.brightness > 0 ? '+' : ''}{adjustments.brightness}</span>
            </div>
            <Slider
              value={[adjustments.brightness]}
              min={-100}
              max={100}
              step={1}
              onValueChange={([val]) => onUpdate({ brightness: val })}
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Contrast</span>
              <span>{adjustments.contrast > 0 ? '+' : ''}{adjustments.contrast}</span>
            </div>
            <Slider
              value={[adjustments.contrast]}
              min={-100}
              max={100}
              step={1}
              onValueChange={([val]) => onUpdate({ contrast: val })}
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Saturation</span>
              <span>{adjustments.saturation > 0 ? '+' : ''}{adjustments.saturation}</span>
            </div>
            <Slider
              value={[adjustments.saturation]}
              min={-100}
              max={100}
              step={1}
              onValueChange={([val]) => onUpdate({ saturation: val })}
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Warmth</span>
              <span>{adjustments.warmth > 0 ? '+' : ''}{adjustments.warmth}</span>
            </div>
            <Slider
              value={[adjustments.warmth]}
              min={-100}
              max={100}
              step={1}
              onValueChange={([val]) => onUpdate({ warmth: val })}
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Fade</span>
              <span>{adjustments.fade}%</span>
            </div>
            <Slider
              value={[adjustments.fade]}
              min={0}
              max={100}
              step={1}
              onValueChange={([val]) => onUpdate({ fade: val })}
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Vignette</span>
              <span>{adjustments.vignette}%</span>
            </div>
            <Slider
              value={[adjustments.vignette]}
              min={0}
              max={100}
              step={1}
              onValueChange={([val]) => onUpdate({ vignette: val })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
