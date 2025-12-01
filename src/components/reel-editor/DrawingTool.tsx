import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Drawing } from '@/hooks/useVideoEditor';
import { Eraser } from 'lucide-react';

interface DrawingToolProps {
  drawings: Drawing[];
  onAdd: (drawing: Drawing) => void;
  onClear: () => void;
}

const colors = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

export function DrawingTool({ drawings, onAdd, onClear }: DrawingToolProps) {
  const [color, setColor] = useState('#ff0000');
  const [width, setWidth] = useState(5);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-4">Drawing</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm mb-2 block">Color</label>
            <div className="grid grid-cols-8 gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    color === c ? 'border-primary' : 'border-border'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Brush Size</span>
              <span>{width}px</span>
            </div>
            <Slider
              value={[width]}
              min={1}
              max={20}
              step={1}
              onValueChange={([val]) => setWidth(val)}
            />
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={onClear}
            disabled={drawings.length === 0}
          >
            <Eraser className="w-4 h-4" />
            Clear All Drawings
          </Button>

          <div className="text-sm text-muted-foreground text-center">
            Click and drag on the video canvas to draw
          </div>
        </div>
      </div>
    </div>
  );
}
