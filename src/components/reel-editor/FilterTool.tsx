import { Button } from '@/components/ui/button';
import { Filters } from '@/hooks/useVideoEditor';
import { Slider } from '@/components/ui/slider';

interface FilterToolProps {
  filters: Filters;
  onUpdate: (updates: Partial<Filters>) => void;
}

const filterPresets = [
  { name: 'None', preset: 'none', style: {} },
  { name: 'Valencia', preset: 'valencia', style: { brightness: 110, contrast: 105, saturation: 110 } },
  { name: 'Lo-fi', preset: 'lofi', style: { brightness: 95, contrast: 120, saturation: 110 } },
  { name: 'Clarendon', preset: 'clarendon', style: { brightness: 110, contrast: 125, saturation: 130 } },
  { name: 'Gingham', preset: 'gingham', style: { brightness: 105, contrast: 90, saturation: 85 } },
  { name: 'Moon', preset: 'moon', style: { brightness: 110, contrast: 110, saturation: 0 } },
  { name: 'Lark', preset: 'lark', style: { brightness: 115, contrast: 90, saturation: 120 } },
  { name: 'Reyes', preset: 'reyes', style: { brightness: 110, contrast: 85, saturation: 75 } },
];

export function FilterTool({ filters, onUpdate }: FilterToolProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-4">Filters</h3>
        
        <div className="grid grid-cols-4 gap-2 mb-6">
          {filterPresets.map((preset) => (
            <Button
              key={preset.preset}
              variant={filters.preset === preset.preset ? 'default' : 'outline'}
              size="sm"
              onClick={() => onUpdate({ ...preset.style, preset: preset.preset })}
              className="h-auto py-2 text-xs"
            >
              {preset.name}
            </Button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Brightness</span>
              <span>{filters.brightness}%</span>
            </div>
            <Slider
              value={[filters.brightness]}
              min={0}
              max={200}
              step={1}
              onValueChange={([val]) => onUpdate({ brightness: val })}
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Contrast</span>
              <span>{filters.contrast}%</span>
            </div>
            <Slider
              value={[filters.contrast]}
              min={0}
              max={200}
              step={1}
              onValueChange={([val]) => onUpdate({ contrast: val })}
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Saturation</span>
              <span>{filters.saturation}%</span>
            </div>
            <Slider
              value={[filters.saturation]}
              min={0}
              max={200}
              step={1}
              onValueChange={([val]) => onUpdate({ saturation: val })}
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Hue</span>
              <span>{filters.hue}°</span>
            </div>
            <Slider
              value={[filters.hue]}
              min={0}
              max={360}
              step={1}
              onValueChange={([val]) => onUpdate({ hue: val })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
