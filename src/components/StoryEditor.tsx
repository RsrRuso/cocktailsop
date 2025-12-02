import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Type, Music2, Sparkles, Download, Pen, Smile, MoreHorizontal, ArrowRight, Upload, Disc3 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import MusicSelectionDialog from "./MusicSelectionDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
    caption?: string;
    shareOption?: "story" | "close-friends";
  }) => void;
  onCancel: () => void;
}

const textColors = ["#FFFFFF", "#000000", "#FF5733", "#33FF57", "#3357FF", "#F333FF", "#FFD700", "#FF1493"];

export const StoryEditor = ({ media, mediaUrl, isVideo, onSave, onCancel }: StoryEditorProps) => {
  const { user } = useAuth();
  const [activeTool, setActiveTool] = useState<"text" | "stickers" | "audio" | "effects" | "draw" | null>(null);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [currentColor, setCurrentColor] = useState("#FFFFFF");
  const [caption, setCaption] = useState("");
  const [showMusicDialog, setShowMusicDialog] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [selectedMusicFile, setSelectedMusicFile] = useState<File | null>(null);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [shareOption, setShareOption] = useState<"story" | "close-friends" | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const musicFileInputRef = useRef<HTMLInputElement>(null);

  const addTextOverlay = () => {
    if (!currentText.trim()) return;
    
    const newOverlay: TextOverlay = {
      id: Date.now().toString(),
      text: currentText,
      x: 50,
      y: 50,
      color: currentColor,
      size: 32,
    };
    
    setTextOverlays([...textOverlays, newOverlay]);
    setCurrentText("");
    setActiveTool(null);
    toast.success("Text added!");
  };

  const removeTextOverlay = (id: string) => {
    setTextOverlays(textOverlays.filter(t => t.id !== id));
  };

  const handleMusicFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      toast.error("Please select a valid audio file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Audio file must be less than 10MB");
      return;
    }

    setUploadingMusic(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('music')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('music')
        .getPublicUrl(fileName);

      setSelectedMusicFile(file);
      setSelectedMusic(publicUrl);
      toast.success(`Music uploaded: ${file.name}`);
    } catch (error: any) {
      console.error('Music upload error:', error);
      toast.error(`Failed to upload: ${error.message}`);
    } finally {
      setUploadingMusic(false);
    }
  };

  const handleShare = () => {
    if (!shareOption) {
      toast.error("Please select where to share");
      return;
    }
    
    onSave({
      musicTrackId: selectedMusic || undefined,
      textOverlays,
      filter: "",
      caption,
      shareOption,
    });
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header - Instagram Style */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onCancel}
          className="text-white hover:bg-white/10"
        >
          <X className="w-6 h-6" />
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Story Canvas */}
        <div ref={canvasRef} className="absolute inset-0 flex items-center justify-center">
          {isVideo ? (
            <video
              ref={videoRef}
              src={mediaUrl}
              className="w-full h-full object-cover"
              loop
              muted
              autoPlay
              playsInline
            />
          ) : (
            <img
              src={mediaUrl}
              alt="Story"
              className="w-full h-full object-cover"
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
                    textShadow: "2px 2px 8px rgba(0,0,0,0.8)",
                    fontWeight: "bold",
                  }}
                >
                  {overlay.text}
                </p>
              </div>
            </div>
          ))}
          
          {/* Music indicator */}
          {selectedMusic && (
            <div className="absolute top-20 right-4 bg-white/20 backdrop-blur-xl rounded-full px-4 py-2 flex items-center gap-2">
              <Music2 className="w-4 h-4 text-white animate-pulse" />
              <span className="text-white text-sm font-medium">
                {selectedMusicFile ? selectedMusicFile.name : "Music added"}
              </span>
            </div>
          )}
        </div>

        {/* Right Side Toolbar - Instagram Style */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-6">
          <button
            onClick={() => setActiveTool(activeTool === "text" ? null : "text")}
            className="flex flex-col items-center gap-1"
          >
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all",
              activeTool === "text" ? "bg-white text-black" : "bg-white/10 text-white"
            )}>
              <Type className="w-6 h-6" />
            </div>
            <span className="text-white text-xs font-medium">Text</span>
          </button>

          <button
            onClick={() => toast.info("Stickers coming soon!")}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white">
              <Smile className="w-6 h-6" />
            </div>
            <span className="text-white text-xs font-medium">Stickers</span>
          </button>

          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => setShowMusicDialog(true)}
              className="relative"
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                selectedMusic ? "bg-white text-black" : "bg-white/10 text-white"
              )}>
                <Music2 className="w-6 h-6" />
              </div>
            </button>
            
            <button
              onClick={() => musicFileInputRef.current?.click()}
              disabled={uploadingMusic}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all mt-2"
            >
              {uploadingMusic ? (
                <Disc3 className="w-6 h-6 animate-spin" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </button>
            
            <span className="text-white text-xs font-medium">Audio</span>
            
            <input
              ref={musicFileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleMusicFileSelect}
              className="hidden"
            />
          </div>

          <button
            onClick={() => toast.info("Effects coming soon!")}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="text-white text-xs font-medium">Effects</span>
          </button>

          <button
            onClick={() => toast.info("Draw coming soon!")}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white">
              <Pen className="w-6 h-6" />
            </div>
            <span className="text-white text-xs font-medium">Draw</span>
          </button>

          <button
            onClick={() => toast.info("Download coming soon!")}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white">
              <Download className="w-6 h-6" />
            </div>
            <span className="text-white text-xs font-medium">Download</span>
          </button>

          <button
            onClick={() => toast.info("More options coming soon!")}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white">
              <MoreHorizontal className="w-6 h-6" />
            </div>
            <span className="text-white text-xs font-medium">More</span>
          </button>
        </div>
      </div>

      {/* Text Input Panel */}
      {activeTool === "text" && (
        <div className="absolute inset-x-0 bottom-32 p-4 bg-black/80 backdrop-blur-xl">
          <div className="space-y-3">
            <Input
              value={currentText}
              onChange={(e) => setCurrentText(e.target.value)}
              placeholder="Type something..."
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-lg"
              onKeyPress={(e) => e.key === "Enter" && addTextOverlay()}
              autoFocus
            />
            
            <div className="flex gap-2 justify-center">
              {textColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setCurrentColor(color)}
                  className={cn(
                    "w-10 h-10 rounded-full border-2 transition-all",
                    currentColor === color ? "border-white scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <Button 
              onClick={addTextOverlay} 
              disabled={!currentText.trim()}
              className="w-full bg-white text-black hover:bg-white/90"
            >
              Add Text
            </Button>
          </div>
        </div>
      )}

      {/* Bottom Section - Caption & Share */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 pt-16">
        <Input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption..."
          className="bg-white/10 border-0 text-white placeholder:text-white/50 mb-4"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShareOption("story");
              handleShare();
            }}
            className="flex-1 flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-full px-4 py-3 transition-all"
          >
            <Avatar className="w-10 h-10 ring-2 ring-white/50">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                {user?.user_metadata?.username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-white font-medium">Your story</span>
          </button>

          <button
            onClick={() => {
              setShareOption("close-friends");
              handleShare();
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-green-500/20 hover:bg-green-500/30 rounded-full px-4 py-3 transition-all"
          >
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-white font-medium">Close Friends</span>
          </button>

          <button
            onClick={handleShare}
            className="w-12 h-12 rounded-full bg-white hover:bg-white/90 flex items-center justify-center transition-all"
          >
            <ArrowRight className="w-6 h-6 text-black" />
          </button>
        </div>
      </div>

      <MusicSelectionDialog
        open={showMusicDialog}
        onOpenChange={setShowMusicDialog}
        onSelect={(track) => {
          setSelectedMusic(track.track_id);
          setShowMusicDialog(false);
          toast.success(`Added: ${track.title}`);
        }}
      />
    </div>
  );
};
