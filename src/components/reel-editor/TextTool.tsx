import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TextOverlay } from '@/hooks/useVideoEditor';
import { Plus, Trash2 } from 'lucide-react';

interface TextToolProps {
  textOverlays: TextOverlay[];
  onAdd: (text: TextOverlay) => void;
  onUpdate: (id: string, updates: Partial<TextOverlay>) => void;
  onRemove: (id: string) => void;
}

const fonts = ['Arial', 'Impact', 'Comic Sans MS', 'Courier New', 'Georgia', 'Times New Roman'];
const animations = ['None', 'Fade In', 'Slide Up', 'Bounce', 'Pop'];

export function TextTool({ textOverlays, onAdd, onUpdate, onRemove }: TextToolProps) {
  const [newText, setNewText] = useState('');
  const [color, setColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(48);
  const [fontFamily, setFontFamily] = useState('Impact');
  const [animation, setAnimation] = useState('None');

  const handleAdd = () => {
    if (!newText.trim()) return;
    
    onAdd({
      id: Date.now().toString(),
      text: newText,
      x: 100,
      y: 100,
      fontSize,
      color,
      fontFamily,
      animation,
    });
    
    setNewText('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-4">Add Text</h3>
        
        <div className="space-y-4">
          <div>
            <Label>Text</Label>
            <Input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Enter text..."
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Font</Label>
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fonts.map(font => (
                    <SelectItem key={font} value={font}>{font}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Size</Label>
              <Input
                type="number"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Color</Label>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="mt-1 h-10"
              />
            </div>

            <div>
              <Label>Animation</Label>
              <Select value={animation} onValueChange={setAnimation}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {animations.map(anim => (
                    <SelectItem key={anim} value={anim}>{anim}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleAdd} className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Add Text
          </Button>
        </div>
      </div>

      {textOverlays.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Text Overlays</h4>
          <div className="space-y-2">
            {textOverlays.map((text) => (
              <div key={text.id} className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm truncate flex-1">{text.text}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(text.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
