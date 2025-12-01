import { Button } from '@/components/ui/button';
import { EditorTool } from '@/pages/ReelEditorPro';
import { Scissors, Gauge, Palette, Sliders, Type, Smile, Pen, Music, Layout } from 'lucide-react';

interface EditorToolbarProps {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
}

const tools: { id: EditorTool; label: string; icon: typeof Scissors }[] = [
  { id: 'trim', label: 'Trim', icon: Scissors },
  { id: 'speed', label: 'Speed', icon: Gauge },
  { id: 'filter', label: 'Filters', icon: Palette },
  { id: 'adjust', label: 'Adjust', icon: Sliders },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'sticker', label: 'Stickers', icon: Smile },
  { id: 'draw', label: 'Draw', icon: Pen },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'layout', label: 'Layout', icon: Layout },
];

export function EditorToolbar({ activeTool, onToolChange }: EditorToolbarProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <Button
            key={tool.id}
            variant={activeTool === tool.id ? 'default' : 'outline'}
            onClick={() => onToolChange(tool.id)}
            className="flex flex-col gap-1 h-auto py-3"
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs">{tool.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
