import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { X, Type, Music, Sparkles, Scissors, Check, Image as ImageIcon, Video } from "lucide-react";
import MusicSelectionDialog from "./MusicSelectionDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
}

interface StoryEditorProps {
  media: File;
  mediaUrl: string;
  isVideo: boolean;
  onSave: (editedData: {
    musicTrackId?: string;
    textOverlays: TextOverlay[];
    filter: string;
    trimStart?: number;
    trimEnd?: number;
  }) => void;
  onCancel: () => void;
}

const filters = [
  { name: "Normal", class: "" },
  { name: "Clarendon", class: "brightness-110 contrast-110 saturate-125" },
  { name: "Gingham", class: "sepia-50 contrast-105" },
  { name: "Moon", class: "grayscale brightness-110 contrast-110" },
  { name: "Lark", class: "contrast-90 brightness-110" },
  { name: "Reyes", class: "sepia-20 brightness-110 contrast-85 saturate-75" },
  { name: "Juno", class: "contrast-110 saturate-125 brightness-110" },
  { name: "Slumber", class: "saturate-150 brightness-105" },
  { name: "Crema", class: "sepia-30 contrast-90" },
];

const textColors = ["#FFFFFF", "#000000", "#FF5733", "#33FF57", "#3357FF", "#F333FF", "#FFD700", "#FF1493"];

export const StoryEditor = ({ media, mediaUrl, isVideo, onSave, onCancel }: StoryEditorProps) => {
  const [activeTab, setActiveTab] = useState<"filter" | "text" | "music" | "trim">("filter");
  const [selectedFilter, setSelectedFilter] = useState("");
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [currentColor, setCurrentColor] = useState("#FFFFFF");
  const [showMusicDialog, setShowMusicDialog] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [videoDuration, setVideoDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVideo && videoRef.current) {
      videoRef.current.onloadedmetadata = () => {
        setVideoDuration(videoRef.current?.duration || 0);
      };
    }
  }, [isVideo]);

  const addTextOverlay = () => {
    if (!currentText.trim()) return;
    
    const newOverlay: TextOverlay = {
      id: Date.now().toString(),
      text: currentText,
      x: 50,
      y: 50,
      color: currentColor,
      size: 24,
    };
    
    setTextOverlays([...textOverlays, newOverlay]);
    setCurrentText("");
  };

  const removeTextOverlay = (id: string) => {
    setTextOverlays(textOverlays.filter(t => t.id !== id));
  };

  const handleSave = () => {
    onSave({
      musicTrackId: selectedMusic || undefined,
      textOverlays,
      filter: selectedFilter,
      trimStart: isVideo ? (trimStart / 100) * videoDuration : undefined,
      trimEnd: isVideo ? (trimEnd / 100) * videoDuration : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/50 backdrop-blur-xl">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
        <h2 className="font-semibold">Edit Story</h2>
        <Button onClick={handleSave} size="sm" className="glow-primary">
          <Check className="w-4 h-4 mr-2" />
          Done
        </Button>
      </div>

      {/* Preview Canvas */}
      <div className="flex-1 relative bg-black overflow-hidden">
        <div
          ref={canvasRef}
          className={cn("absolute inset-0 flex items-center justify-center", selectedFilter)}
        >
          {isVideo ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              className="max-w-full max-h-full object-contain"
              controls
              playsInline
            />
          ) : (
            <img
              src={mediaUrl}
              alt="Story preview"
              className="max-w-full max-h-full object-contain"
            />
          )}
          
          {/* Text Overlays */}
          {textOverlays.map((overlay) => (
            <div
              key={overlay.id}
              className="absolute cursor-move"
              style={{
                left: `${overlay.x}%`,
                top: `${overlay.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="relative group">
                <p
                  style={{
                    color: overlay.color,
                    fontSize: `${overlay.size}px`,
                    textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                    fontWeight: "bold",
                  }}
                >
                  {overlay.text}
                </p>
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeTextOverlay(overlay.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tools */}
      <div className="border-t border-border/50 bg-card/80 backdrop-blur-xl">
        {/* Tab Bar */}
        <div className="flex items-center justify-around p-2 border-b border-border/30">
          <Button
            variant={activeTab === "filter" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("filter")}
            className="flex-1"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button
            variant={activeTab === "text" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("text")}
            className="flex-1"
          >
            <Type className="w-4 h-4 mr-2" />
            Text
          </Button>
          <Button
            variant={activeTab === "music" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("music")}
            className="flex-1"
          >
            <Music className="w-4 h-4 mr-2" />
            Music
          </Button>
          {isVideo && (
            <Button
              variant={activeTab === "trim" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("trim")}
              className="flex-1"
            >
              <Scissors className="w-4 h-4 mr-2" />
              Trim
            </Button>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-4 max-h-[200px] overflow-y-auto">
          {activeTab === "filter" && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {filters.map((filter) => (
                <button
                  key={filter.name}
                  onClick={() => setSelectedFilter(filter.class)}
                  className={cn(
                    "flex-shrink-0 relative rounded-xl overflow-hidden border-2 transition-all",
                    selectedFilter === filter.class
                      ? "border-primary shadow-lg shadow-primary/50 scale-105"
                      : "border-transparent"
                  )}
                >
                  <div className={cn("w-16 h-20", filter.class)}>
                    {isVideo ? (
                      <Video className="w-full h-full p-4 bg-muted" />
                    ) : (
                      <ImageIcon className="w-full h-full p-4 bg-muted" />
                    )}
                  </div>
                  <p className="text-xs text-center mt-1 font-medium">{filter.name}</p>
                </button>
              ))}
            </div>
          )}

          {activeTab === "text" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={currentText}
                  onChange={(e) => setCurrentText(e.target.value)}
                  placeholder="Type your text..."
                  className="flex-1"
                  onKeyPress={(e) => e.key === "Enter" && addTextOverlay()}
                />
                <Button onClick={addTextOverlay} disabled={!currentText.trim()}>
                  <Check className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex gap-2">
                {textColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setCurrentColor(color)}
                    className={cn(
                      "w-10 h-10 rounded-full border-2 transition-all",
                      currentColor === color ? "border-primary scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {textOverlays.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {textOverlays.length} text overlay(s) added. Click on text in preview to remove.
                </div>
              )}
            </div>
          )}

          {activeTab === "music" && (
            <div className="space-y-3">
              <Button
                onClick={() => setShowMusicDialog(true)}
                variant="outline"
                className="w-full"
              >
                <Music className="w-4 h-4 mr-2" />
                {selectedMusic ? "Change Music" : "Add Music"}
              </Button>
              {selectedMusic && (
                <p className="text-sm text-muted-foreground text-center">
                  Music added ✓
                </p>
              )}
            </div>
          )}

          {activeTab === "trim" && isVideo && (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Trim Start</label>
                <Slider
                  value={[trimStart]}
                  onValueChange={(v) => setTrimStart(v[0])}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {((trimStart / 100) * videoDuration).toFixed(1)}s
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Trim End</label>
                <Slider
                  value={[trimEnd]}
                  onValueChange={(v) => setTrimEnd(v[0])}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {((trimEnd / 100) * videoDuration).toFixed(1)}s
                </p>
              </div>

              <p className="text-sm text-center text-muted-foreground">
                Duration: {(((trimEnd - trimStart) / 100) * videoDuration).toFixed(1)}s
              </p>
            </div>
          )}
        </div>
      </div>

      <MusicSelectionDialog
        open={showMusicDialog}
        onOpenChange={setShowMusicDialog}
        onSelect={(track) => {
          setSelectedMusic(track.track_id);
          toast.success(`Added: ${track.title}`);
        }}
      />
    </div>
  );
};
