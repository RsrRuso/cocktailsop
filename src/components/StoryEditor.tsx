import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Type, Music2, Sparkles, Download, Pen, Smile, MoreHorizontal, ArrowRight, Upload, Disc3, Brain, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import MusicSelectionDialog from "./MusicSelectionDialog";
import { SmartStoryFeatures } from "./story/SmartStoryFeatures";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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
  const [showSmartFeatures, setShowSmartFeatures] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [selectedMusicFile, setSelectedMusicFile] = useState<File | null>(null);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [shareOption, setShareOption] = useState<"story" | "close-friends" | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [musicDuration, setMusicDuration] = useState(0);
  const [musicCurrentTime, setMusicCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(45); // Max 45 seconds
  const [musicName, setMusicName] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const musicFileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Handle audio playback
  useEffect(() => {
    if (audioRef.current && selectedMusic) {
      audioRef.current.volume = isMuted ? 0 : musicVolume;
    }
  }, [musicVolume, isMuted, selectedMusic]);

  // Auto-play music when selected
  useEffect(() => {
    if (selectedMusic && audioRef.current) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
    }
  }, [selectedMusic]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setMusicCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const duration = audioRef.current.duration;
      setMusicDuration(duration);
      // Set trim end to min of duration or 45 seconds
      setTrimEnd(Math.min(duration, 45));
      // Start playback from trim start
      audioRef.current.currentTime = trimStart;
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      const newTime = Math.max(trimStart, Math.min(value[0], trimEnd));
      audioRef.current.currentTime = newTime;
      setMusicCurrentTime(newTime);
    }
  };

  // Loop within trim range
  useEffect(() => {
    if (audioRef.current && musicCurrentTime >= trimEnd) {
      audioRef.current.currentTime = trimStart;
      setMusicCurrentTime(trimStart);
    }
  }, [musicCurrentTime, trimStart, trimEnd]);

  const handleTrimChange = (values: number[]) => {
    const [start, end] = values;
    const maxDuration = 45;
    const actualEnd = Math.min(end, start + maxDuration, musicDuration);
    setTrimStart(start);
    setTrimEnd(actualEnd);
    if (audioRef.current && audioRef.current.currentTime < start) {
      audioRef.current.currentTime = start;
      setMusicCurrentTime(start);
    }
  };

  const getTrimDuration = () => {
    return Math.min(trimEnd - trimStart, 45);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
      setMusicName(file.name);
      setTrimStart(0);
      setTrimEnd(45);
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
      trimStart: selectedMusic ? trimStart : undefined,
      trimEnd: selectedMusic ? trimEnd : undefined,
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

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSmartFeatures(true)}
          className="text-white hover:bg-white/10 gap-2 bg-white/5 backdrop-blur-sm"
        >
          <Brain className="w-4 h-4" />
          AI Tools
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
          
          {/* Music Player - Instagram Style */}
          {selectedMusic && (
            <>
              {/* Hidden Audio Element */}
              <audio
                ref={audioRef}
                src={selectedMusic}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = trimStart;
                    audioRef.current.play();
                  }
                }}
              />
              
              {/* Music Controls Overlay - Compact Mobile */}
              <div className="absolute top-16 left-2 right-16 bg-black/70 backdrop-blur-xl rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlayPause}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center hover:scale-105 transition-all shadow-lg flex-shrink-0"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-white" />
                    ) : (
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold truncate flex items-center gap-1">
                      <Music2 className="w-3 h-3 text-pink-400 flex-shrink-0" />
                      {musicName || selectedMusicFile?.name || "Music Track"}
                    </p>
                    <p className="text-white/60 text-[10px]">
                      {formatTime(getTrimDuration())} / 45s
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center"
                    >
                      {isMuted ? (
                        <VolumeX className="w-3 h-3 text-white" />
                      ) : (
                        <Volume2 className="w-3 h-3 text-white" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMusic(null);
                        setSelectedMusicFile(null);
                        setMusicName("");
                        setIsPlaying(false);
                      }}
                      className="w-7 h-7 rounded-full bg-red-500/30 flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>
                
                {/* Playback Progress - Compact */}
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-[10px] w-8">{formatTime(musicCurrentTime - trimStart)}</span>
                  <Slider
                    value={[musicCurrentTime]}
                    min={trimStart}
                    max={trimEnd}
                    step={0.1}
                    onValueChange={handleSeek}
                    className="flex-1"
                  />
                  <span className="text-white/60 text-[10px] w-8">{formatTime(getTrimDuration())}</span>
                </div>

                {/* Trim Controls - Compact */}
                {musicDuration > 0 && (
                  <div className="space-y-1 pt-1 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-white/70 text-[10px]">Trim</span>
                      <span className="text-pink-400 text-[10px] font-medium">
                        {formatTime(trimStart)} - {formatTime(trimEnd)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <Slider
                        value={[trimStart]}
                        min={0}
                        max={Math.max(0, musicDuration - 5)}
                        step={0.5}
                        onValueChange={(v) => {
                          const newStart = v[0];
                          setTrimStart(newStart);
                          if (trimEnd - newStart > 45) {
                            setTrimEnd(newStart + 45);
                          }
                          if (audioRef.current && audioRef.current.currentTime < newStart) {
                            audioRef.current.currentTime = newStart;
                          }
                        }}
                        className="w-full"
                      />
                      <Slider
                        value={[trimEnd]}
                        min={trimStart + 5}
                        max={Math.min(musicDuration, trimStart + 45)}
                        step={0.5}
                        onValueChange={(v) => setTrimEnd(v[0])}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Side Toolbar - Mobile Optimized */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-3">
          <button
            onClick={() => setActiveTool(activeTool === "text" ? null : "text")}
            className="flex flex-col items-center gap-0.5"
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              activeTool === "text" ? "bg-white text-black" : "bg-white/20 text-white"
            )}>
              <Type className="w-5 h-5" />
            </div>
          </button>

          <div className="flex flex-col items-center gap-0.5">
            <button
              onClick={() => setShowMusicDialog(true)}
              className="relative"
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                selectedMusic ? "bg-white text-black" : "bg-white/20 text-white"
              )}>
                <Music2 className="w-5 h-5" />
              </div>
            </button>
            
            <button
              onClick={() => musicFileInputRef.current?.click()}
              disabled={uploadingMusic}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"
            >
              {uploadingMusic ? (
                <Disc3 className="w-5 h-5 animate-spin" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
            </button>
            <span className="text-white text-[10px]">Audio</span>
            
            <input
              ref={musicFileInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
              onChange={handleMusicFileSelect}
              className="hidden"
            />
          </div>

          <button
            onClick={() => setShowSmartFeatures(true)}
            className="flex flex-col items-center gap-0.5"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg">
              <Brain className="w-5 h-5" />
            </div>
            <span className="text-white text-[10px]">AI</span>
          </button>

          <button
            onClick={() => toast.info("Effects coming soon!")}
            className="flex flex-col items-center gap-0.5"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
          </button>

          <button
            onClick={() => toast.info("Draw coming soon!")}
            className="flex flex-col items-center gap-0.5"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
              <Pen className="w-5 h-5" />
            </div>
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

      {/* Bottom Section - Caption & Share - Mobile Optimized */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 pt-12">
        <Input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption..."
          className="bg-white/10 border-0 text-white placeholder:text-white/50 mb-3 h-10 text-sm"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShareOption("story");
              handleShare();
            }}
            className="flex-1 flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-full px-3 py-2.5 transition-all"
          >
            <Avatar className="w-8 h-8 ring-2 ring-white/30">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                {user?.user_metadata?.username?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-white text-sm font-medium">Story</span>
          </button>

          <button
            onClick={() => {
              setShareOption("close-friends");
              handleShare();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-500/20 hover:bg-green-500/30 rounded-full px-3 py-2.5 transition-all"
          >
            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-white text-sm font-medium">Close</span>
          </button>

          <button
            onClick={handleShare}
            className="w-11 h-11 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center transition-all shadow-lg"
          >
            <ArrowRight className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>
      </div>

      <MusicSelectionDialog
        open={showMusicDialog}
        onOpenChange={setShowMusicDialog}
        onSelect={(track) => {
          // Only use preview_audio - the actual audio file URL
          const audioUrl = track.preview_audio;
          
          if (audioUrl && audioUrl.startsWith('http')) {
            setSelectedMusic(audioUrl);
            setSelectedMusicFile(null);
            setMusicName(`${track.title} - ${track.artist}`);
            setTrimStart(0);
            setTrimEnd(45);
            toast.success(`Added: ${track.title} by ${track.artist}`);
          } else {
            toast.error("This track doesn't have a playable preview. Try another track with 🎵 icon!");
          }
          setShowMusicDialog(false);
        }}
      />

      <Sheet open={showSmartFeatures} onOpenChange={setShowSmartFeatures}>
        <SheetContent side="bottom" className="h-[85vh] p-0 overflow-hidden">
          <SheetHeader className="px-6 pt-6 pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              AI Story Intelligence
            </SheetTitle>
            <SheetDescription>
              Advanced tools to create viral content
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto h-[calc(85vh-120px)]">
            <SmartStoryFeatures
              mediaUrl={mediaUrl}
              onApplySuggestion={(type, data) => {
                if (type === "caption" && typeof data === "string") {
                  setCaption(data);
                  toast.success("Caption applied!");
                }
                if (type === "hashtags" && Array.isArray(data)) {
                  setCaption(prev => prev + " " + data.map((tag: string) => `#${tag}`).join(" "));
                  toast.success("Hashtags added!");
                }
                if (type === "music" && data) {
                  setSelectedMusic(data.title);
                  toast.success("Music suggestion applied!");
                }
                setShowSmartFeatures(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
