import { Button } from '@/components/ui/button';
import { LayoutMode } from '@/hooks/useVideoEditor';
import { Maximize, Layout, Grid2X2 } from 'lucide-react';

interface LayoutToolProps {
  layoutMode: LayoutMode;
  onUpdate: (mode: LayoutMode) => void;
}

const layouts: { mode: LayoutMode; label: string; icon: typeof Maximize }[] = [
  { mode: 'single', label: 'Single', icon: Maximize },
  { mode: 'side-by-side', label: 'Side by Side', icon: Layout },
  { mode: 'pip', label: 'PIP', icon: Layout },
  { mode: 'grid', label: 'Grid', icon: Grid2X2 },
];

export function LayoutTool({ layoutMode, onUpdate }: LayoutToolProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-4">Layout</h3>
        
        <div className="grid grid-cols-2 gap-3">
          {layouts.map((layout) => {
            const Icon = layout.icon;
            return (
              <Button
                key={layout.mode}
                variant={layoutMode === layout.mode ? 'default' : 'outline'}
                onClick={() => onUpdate(layout.mode)}
                className="flex flex-col gap-2 h-auto py-4"
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs">{layout.label}</span>
              </Button>
            );
          })}
        </div>

        <div className="mt-4 text-sm text-muted-foreground text-center">
          Upload additional videos to use multi-clip layouts
        </div>
      </div>
    </div>
  );
}
