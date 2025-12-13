import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Scissors, Crop, Type, Hash, MapPin, Music, 
  Wand2, Palette, Layers, Volume2, Timer
} from 'lucide-react';

export type StudioTool = 
  | 'trim' 
  | 'crop' 
  | 'caption' 
  | 'tags' 
  | 'location' 
  | 'music'
  | 'filters'
  | 'adjust'
  | 'layers'
  | 'audio'
  | 'speed';

interface StudioToolbarProps {
  activeTool: StudioTool | null;
  onToolChange: (tool: StudioTool | null) => void;
  mediaType: 'video' | 'image';
}

export function StudioToolbar({ activeTool, onToolChange, mediaType }: StudioToolbarProps) {
  const tools = [
    { id: 'trim' as const, icon: Scissors, label: 'Trim', videoOnly: true },
    { id: 'crop' as const, icon: Crop, label: 'Crop' },
    { id: 'caption' as const, icon: Type, label: 'Caption' },
    { id: 'tags' as const, icon: Hash, label: 'Tags' },
    { id: 'location' as const, icon: MapPin, label: 'Location' },
    { id: 'music' as const, icon: Music, label: 'Music', videoOnly: true },
    { id: 'filters' as const, icon: Palette, label: 'Filters' },
    { id: 'adjust' as const, icon: Wand2, label: 'Adjust' },
    { id: 'audio' as const, icon: Volume2, label: 'Audio', videoOnly: true },
    { id: 'speed' as const, icon: Timer, label: 'Speed', videoOnly: true },
  ];

  const availableTools = tools.filter(tool => 
    !tool.videoOnly || mediaType === 'video'
  );

  return (
    <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
      {availableTools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        
        return (
          <Button
            key={tool.id}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            className={`flex-shrink-0 flex-col h-auto py-2 px-3 gap-1 ${
              isActive ? 'bg-primary text-primary-foreground' : ''
            }`}
            onClick={() => onToolChange(isActive ? null : tool.id)}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs">{tool.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
