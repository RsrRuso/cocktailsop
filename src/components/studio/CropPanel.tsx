import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CropPanelProps {
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
}

const ASPECT_RATIOS = [
  { id: '9:16', label: '9:16', desc: 'Vertical', width: 9, height: 16 },
  { id: '1:1', label: '1:1', desc: 'Square', width: 1, height: 1 },
  { id: '4:5', label: '4:5', desc: 'Portrait', width: 4, height: 5 },
  { id: '16:9', label: '16:9', desc: 'Landscape', width: 16, height: 9 },
  { id: 'original', label: 'Original', desc: 'Keep original', width: null, height: null },
];

export function CropPanel({ aspectRatio, onAspectRatioChange }: CropPanelProps) {
  return (
    <div className="p-4 space-y-4 bg-card rounded-xl border border-border/40">
      <h3 className="font-medium">Aspect Ratio</h3>

      <div className="grid grid-cols-5 gap-2">
        {ASPECT_RATIOS.map((ratio) => {
          const isActive = aspectRatio === ratio.id;
          
          return (
            <button
              key={ratio.id}
              onClick={() => onAspectRatioChange(ratio.id)}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                isActive 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border/40 hover:border-border'
              )}
            >
              {/* Visual representation */}
              <div className="relative w-8 h-10 flex items-center justify-center">
                {ratio.width && ratio.height ? (
                  <div 
                    className={cn(
                      'bg-muted border border-border rounded-sm',
                      isActive && 'bg-primary/20 border-primary'
                    )}
                    style={{
                      width: ratio.width > ratio.height ? '100%' : `${(ratio.width / ratio.height) * 100}%`,
                      height: ratio.height > ratio.width ? '100%' : `${(ratio.height / ratio.width) * 100}%`,
                      maxWidth: '32px',
                      maxHeight: '40px',
                    }}
                  />
                ) : (
                  <div className={cn(
                    'w-6 h-8 bg-muted border border-border rounded-sm border-dashed',
                    isActive && 'bg-primary/20 border-primary'
                  )} />
                )}
              </div>
              
              <span className="text-xs font-medium">{ratio.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {ASPECT_RATIOS.find(r => r.id === aspectRatio)?.desc}
      </p>
    </div>
  );
}
