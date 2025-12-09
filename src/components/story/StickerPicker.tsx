import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

interface Sticker {
  id: string;
  emoji: string;
  category: string;
}

interface StickerPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (sticker: Sticker) => void;
}

const emojiCategories = {
  recent: ["😀", "❤️", "🔥", "👍", "😂", "🎉", "💯", "✨"],
  smileys: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘"],
  love: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟"],
  gestures: ["👍", "👎", "👌", "🤌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "✋", "🖐️"],
  celebration: ["🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🎯", "🎪", "🎭", "🎬", "🎤", "🎧", "🎵", "🎶", "🎸", "🎹"],
  food: ["☕", "🍺", "🍸", "🍷", "🥂", "🍾", "🧃", "🧋", "🍹", "🍶", "🧉", "🥤", "🍵", "🫖", "🍻", "🥃"],
  travel: ["✈️", "🚀", "🌍", "🗺️", "🏝️", "🏔️", "🌅", "🌄", "🌃", "🌆", "🌇", "🌉", "🎡", "🎢", "🛫", "🛬"],
  weather: ["☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "💨", "🌈", "🌊", "🔥", "✨"],
};

const interactiveStickers = [
  { id: "poll", name: "Poll", icon: "📊" },
  { id: "question", name: "Question", icon: "❓" },
  { id: "quiz", name: "Quiz", icon: "🎯" },
  { id: "countdown", name: "Countdown", icon: "⏰" },
  { id: "mention", name: "Mention", icon: "@" },
  { id: "hashtag", name: "Hashtag", icon: "#" },
  { id: "location", name: "Location", icon: "📍" },
  { id: "link", name: "Link", icon: "🔗" },
];

export function StickerPicker({ open, onOpenChange, onSelect }: StickerPickerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<keyof typeof emojiCategories>("recent");

  const handleEmojiSelect = (emoji: string) => {
    onSelect({
      id: Date.now().toString(),
      emoji,
      category: activeCategory,
    });
    onOpenChange(false);
  };

  const filteredEmojis = search
    ? Object.values(emojiCategories).flat().filter(emoji => emoji.includes(search))
    : emojiCategories[activeCategory];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Smile className="w-5 h-5 text-primary" />
            Stickers
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stickers..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Interactive Stickers */}
        <div className="px-4 py-2 border-b">
          <p className="text-xs text-muted-foreground mb-2">INTERACTIVE</p>
          <div className="grid grid-cols-4 gap-2">
            {interactiveStickers.map((sticker) => (
              <button
                key={sticker.id}
                onClick={() => handleEmojiSelect(sticker.icon)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-accent/50 transition-colors"
              >
                <span className="text-2xl">{sticker.icon}</span>
                <span className="text-[10px] text-muted-foreground">{sticker.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex gap-1 px-4 py-2 overflow-x-auto">
            {Object.keys(emojiCategories).map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category as keyof typeof emojiCategories)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                  activeCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent/50 hover:bg-accent"
                )}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          {/* Emoji Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-8 gap-1">
              {filteredEmojis.map((emoji, index) => (
                <button
                  key={`${emoji}-${index}`}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-accent/50 rounded-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
