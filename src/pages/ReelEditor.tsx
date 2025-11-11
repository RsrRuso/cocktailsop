import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  X, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Scissors, Wand2, Type, Music, Sparkles, Image as ImageIcon,
  Zap, Layers, Download, Check, RotateCw, Undo2, Redo2,
  Palette, Filter, Sun, Contrast, Droplets, Crop, Film
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VideoClip {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
}

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontFamily: string;
  timestamp: number;
}

interface FilterEffect {
  id: string;
  name: string;
  icon: any;
  filter: string;
}

const ReelEditor = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Editing states
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);
  
  // UI states
  const [activeTab, setActiveTab] = useState("trim");
  const [isTextMode, setIsTextMode] = useState(false);
  const [newText, setNewText] = useState("");
  const [selectedTextColor, setSelectedTextColor] = useState("#FFFFFF");

  const filters: FilterEffect[] = [
    { id: "none", name: "None", icon: Filter, filter: "" },
    { id: "vintage", name: "Vintage", icon: Sparkles, filter: "sepia(50%) contrast(120%)" },
    { id: "cool", name: "Cool", icon: Droplets, filter: "hue-rotate(180deg)" },
    { id: "warm", name: "Warm", icon: Sun, filter: "hue-rotate(-20deg) saturate(150%)" },
    { id: "dramatic", name: "Dramatic", icon: Contrast, filter: "contrast(150%) brightness(80%)" },
    { id: "bw", name: "B&W", icon: Film, filter: "grayscale(100%)" },
  ];

  const speedOptions = [
    { label: "0.5x", value: 0.5 },
    { label: "0.75x", value: 0.75 },
    { label: "1x", value: 1 },
    { label: "1.5x", value: 1.5 },
    { label: "2x", value: 2 },
  ];

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateDuration);

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateDuration);
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!videoRef.current) return;
    videoRef.current.volume = value[0];
    setVolume(value[0]);
  };

  const addClip = () => {
    const newClip: VideoClip = {
      id: Date.now().toString(),
      startTime: currentTime,
      endTime: Math.min(currentTime + 5, duration),
      duration: 5,
    };
    setClips([...clips, newClip]);
    toast.success("Clip added to timeline");
  };

  const addTextOverlay = () => {
    if (!newText.trim()) return;

    const overlay: TextOverlay = {
      id: Date.now().toString(),
      text: newText,
      x: 50,
      y: 50,
      color: selectedTextColor,
      fontSize: 32,
      fontFamily: "Arial",
      timestamp: currentTime,
    };
    setTextOverlays([...textOverlays, overlay]);
    setNewText("");
    toast.success("Text added");
  };

  const applyFilter = (filterId: string) => {
    setSelectedFilter(filterId);
    toast.success("Filter applied");
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getVideoStyle = () => {
    const filter = filters.find(f => f.id === selectedFilter);
    return {
      filter: `${filter?.filter || ""} brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`,
    };
  };

  const handleExport = () => {
    toast.success("Exporting reel...", {
      description: "Your reel is being processed. This may take a moment.",
    });
    
    // Simulate export process
    setTimeout(() => {
      toast.success("Reel exported successfully!");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/90 backdrop-blur-lg border-b border-white/10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-white hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Edit Reel</h1>
        <Button
          onClick={handleExport}
          className="bg-gradient-to-r from-primary to-primary/60"
        >
          <Check className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-185px)] lg:h-[calc(100vh-73px)]">
        {/* Video Preview */}
        <div className="flex-1 flex items-center justify-center bg-black relative p-4 lg:p-8">
          <div className="relative max-w-[400px] w-full aspect-[9/16] bg-black rounded-xl overflow-hidden shadow-2xl">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              style={getVideoStyle()}
              src="https://www.w3schools.com/html/mov_bbb.mp4" // Sample video
              loop
            />
            
            {/* Text Overlays */}
            {textOverlays.map((overlay) => (
              <div
                key={overlay.id}
                className="absolute"
                style={{
                  left: `${overlay.x}%`,
                  top: `${overlay.y}%`,
                  color: overlay.color,
                  fontSize: `${overlay.fontSize}px`,
                  fontFamily: overlay.fontFamily,
                  textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                  fontWeight: "bold",
                }}
              >
                {overlay.text}
              </div>
            ))}

            {/* Play/Pause Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Button
                variant="ghost"
                size="icon"
                className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm pointer-events-auto opacity-0 hover:opacity-100 transition-opacity"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8" />
                ) : (
                  <Play className="w-8 h-8 ml-1" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Editing Tools - Fixed on mobile, sidebar on desktop */}
        <div className="fixed lg:relative bottom-[72px] lg:bottom-0 left-0 right-0 lg:w-96 bg-black/95 lg:bg-black/50 backdrop-blur-lg border-t lg:border-l border-white/10 overflow-y-auto max-h-[40vh] lg:max-h-none z-40">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 bg-white/5 sticky top-0 z-10">
              <TabsTrigger value="trim" className="flex flex-col gap-1">
                <Scissors className="w-4 h-4" />
                <span className="text-xs">Trim</span>
              </TabsTrigger>
              <TabsTrigger value="filters" className="flex flex-col gap-1">
                <Wand2 className="w-4 h-4" />
                <span className="text-xs">Filters</span>
              </TabsTrigger>
              <TabsTrigger value="text" className="flex flex-col gap-1">
                <Type className="w-4 h-4" />
                <span className="text-xs">Text</span>
              </TabsTrigger>
              <TabsTrigger value="adjust" className="flex flex-col gap-1">
                <Palette className="w-4 h-4" />
                <span className="text-xs">Adjust</span>
              </TabsTrigger>
            </TabsList>

            <div className="p-4 space-y-4">
              <TabsContent value="trim" className="mt-0 space-y-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Playback Speed</h3>
                  <div className="flex gap-2">
                    {speedOptions.map((option) => (
                      <Button
                        key={option.value}
                        variant={playbackSpeed === option.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPlaybackSpeed(option.value)}
                        className={cn(
                          playbackSpeed === option.value && "bg-primary"
                        )}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Clips</h3>
                    <Button size="sm" onClick={addClip}>
                      <Scissors className="w-4 h-4 mr-2" />
                      Cut Clip
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {clips.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No clips yet. Cut video to create clips.
                      </p>
                    ) : (
                      clips.map((clip, index) => (
                        <div
                          key={clip.id}
                          className="p-3 rounded-lg bg-white/5 border border-white/10"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Clip {index + 1}</span>
                            <Badge variant="outline">
                              {formatTime(clip.duration)}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="filters" className="mt-0 space-y-4">
                <h3 className="text-sm font-semibold">Video Filters</h3>
                <div className="grid grid-cols-3 gap-3">
                  {filters.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => applyFilter(filter.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        selectedFilter === filter.id
                          ? "border-primary bg-primary/20"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      )}
                    >
                      <filter.icon className="w-6 h-6" />
                      <span className="text-xs">{filter.name}</span>
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="text" className="mt-0 space-y-4">
                <h3 className="text-sm font-semibold">Add Text</h3>
                <div className="space-y-3">
                  <Input
                    placeholder="Enter text..."
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    className="bg-white/5 border-white/10"
                  />
                  
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Text Color</label>
                    <div className="flex gap-2">
                      {["#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"].map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedTextColor(color)}
                          className={cn(
                            "w-10 h-10 rounded-lg border-2",
                            selectedTextColor === color ? "border-white" : "border-white/20"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <Button onClick={addTextOverlay} className="w-full">
                    <Type className="w-4 h-4 mr-2" />
                    Add Text
                  </Button>
                </div>

                {textOverlays.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground">Added Text</h4>
                    {textOverlays.map((overlay, index) => (
                      <div
                        key={overlay.id}
                        className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between"
                      >
                        <span className="text-sm">{overlay.text}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTextOverlays(textOverlays.filter(t => t.id !== overlay.id));
                            toast.success("Text removed");
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="adjust" className="mt-0 space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Sun className="w-4 h-4" />
                      Brightness
                    </label>
                    <span className="text-sm text-muted-foreground">{brightness}%</span>
                  </div>
                  <Slider
                    value={[brightness]}
                    onValueChange={(v) => setBrightness(v[0])}
                    min={0}
                    max={200}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Contrast className="w-4 h-4" />
                      Contrast
                    </label>
                    <span className="text-sm text-muted-foreground">{contrast}%</span>
                  </div>
                  <Slider
                    value={[contrast]}
                    onValueChange={(v) => setContrast(v[0])}
                    min={0}
                    max={200}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Droplets className="w-4 h-4" />
                      Saturation
                    </label>
                    <span className="text-sm text-muted-foreground">{saturation}%</span>
                  </div>
                  <Slider
                    value={[saturation]}
                    onValueChange={(v) => setSaturation(v[0])}
                    min={0}
                    max={200}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Blur</label>
                    <span className="text-sm text-muted-foreground">{blur}px</span>
                  </div>
                  <Slider
                    value={[blur]}
                    onValueChange={(v) => setBlur(v[0])}
                    min={0}
                    max={10}
                    step={0.5}
                    className="w-full"
                  />
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setBrightness(100);
                    setContrast(100);
                    setSaturation(100);
                    setBlur(0);
                    toast.success("Reset to defaults");
                  }}
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Reset All
                </Button>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Timeline Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-white/10 p-4">
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Timeline Slider */}
          <div className="space-y-2">
            <Slider
              value={[currentTime]}
              onValueChange={handleSeek}
              max={duration || 100}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setCurrentTime(Math.max(0, currentTime - 5))}>
                <SkipBack className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={togglePlay}>
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setCurrentTime(Math.min(duration, currentTime + 5))}>
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={toggleMute}>
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                max={1}
                step={0.01}
                className="w-24"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReelEditor;
