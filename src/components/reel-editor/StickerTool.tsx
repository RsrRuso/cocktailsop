import { Button } from '@/components/ui/button';
import { Sticker } from '@/hooks/useVideoEditor';
import { Trash2 } from 'lucide-react';

interface StickerToolProps {
  stickers: Sticker[];
  onAdd: (sticker: Sticker) => void;
  onRemove: (id: string) => void;
}

const emojiList = ['😀', '😂', '❤️', '🔥', '👍', '🎉', '💯', '✨', '🌟', '💪', '🙌', '👏', '🎵', '🎨', '🍕', '☕'];

export function StickerTool({ stickers, onAdd, onRemove }: StickerToolProps) {
  const handleAddEmoji = (emoji: string) => {
    onAdd({
      id: Date.now().toString(),
      type: 'emoji',
      content: emoji,
      x: 150,
      y: 150,
      size: 64,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-4">Stickers & Emojis</h3>
        
        <div className="grid grid-cols-8 gap-2 mb-4">
          {emojiList.map((emoji) => (
            <Button
              key={emoji}
              variant="outline"
              size="sm"
              onClick={() => handleAddEmoji(emoji)}
              className="text-2xl p-2 h-auto"
            >
              {emoji}
            </Button>
          ))}
        </div>
      </div>

      {stickers.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Added Stickers</h4>
          <div className="space-y-2">
            {stickers.map((sticker) => (
              <div key={sticker.id} className="flex items-center justify-between p-2 border rounded">
                <span className="text-2xl">{sticker.content}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(sticker.id)}
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
