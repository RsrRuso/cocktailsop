import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  X, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Scissors, Wand2, Type, Music, Sparkles, Upload as UploadIcon,
  Zap, Layers, Download, Check, RotateCw, Undo2, Redo2,
  Palette, Filter, Sun, Contrast, Droplets, Crop, Film, Plus,
  Move, Trash2, Copy, Eye, EyeOff, Settings, Maximize
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isUploading, setIsUploading] = useState(false);

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
    { id: "none", name: "Original", icon: Filter, filter: "" },
    { id: "vivid", name: "Vivid", icon: Sparkles, filter: "saturate(180%) contrast(120%)" },
    { id: "vintage", name: "Vintage", icon: Sparkles, filter: "sepia(50%) contrast(120%)" },
    { id: "cool", name: "Arctic", icon: Droplets, filter: "hue-rotate(180deg) saturate(120%)" },
    { id: "warm", name: "Sunset", icon: Sun, filter: "hue-rotate(-20deg) saturate(150%)" },
    { id: "dramatic", name: "Dramatic", icon: Contrast, filter: "contrast(150%) brightness(80%)" },
    { id: "bw", name: "Noir", icon: Film, filter: "grayscale(100%) contrast(130%)" },
    { id: "cyberpunk", name: "Cyber", icon: Zap, filter: "saturate(200%) contrast(130%) hue-rotate(270deg)" },
    { id: "neon", name: "Neon", icon: Sparkles, filter: "saturate(300%) brightness(110%) hue-rotate(90deg)" },
  ];

  const speedOptions = [
    { label: "0.25x", value: 0.25 },
    { label: "0.5x", value: 0.5 },
    { label: "0.75x", value: 0.75 },
    { label: "1x", value: 1 },
    { label: "1.25x", value: 1.25 },
    { label: "1.5x", value: 1.5 },
    { label: "2x", value: 2 },
    { label: "3x", value: 3 },
  ];

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's a video file
    if (!file.type.startsWith('video/')) {
      toast.error("Please upload a video file");
      return;
    }

    setIsUploading(true);
    
    try {
      // Create local URL for immediate preview
      const localUrl = URL.createObjectURL(file);
      setVideoUrl(localUrl);
      toast.success("Video loaded successfully!");
    } catch (error) {
      console.error("Error loading video:", error);
      toast.error("Failed to load video");
    } finally {
      setIsUploading(false);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoUpload}
        className="hidden"
      />
      
      {/* Futuristic Header */}
      <div className="relative flex items-center justify-between p-4 bg-black/80 backdrop-blur-xl border-b border-cyan-500/20">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="relative text-white hover:bg-white/10 hover:scale-110 transition-all"
        >
          <X className="w-5 h-5" />
        </Button>
        <div className="relative">
          <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Advanced Reel Studio
          </h1>
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
        </div>
        <Button
          onClick={handleExport}
          disabled={!videoUrl}
          className="relative bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:scale-105 transition-all disabled:opacity-50"
        >
          <Check className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-185px)] lg:h-[calc(100vh-73px)]">
        {/* Video Preview */}
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 relative p-4 lg:p-8">
          {!videoUrl ? (
            <div className="relative max-w-[400px] w-full aspect-[9/16] bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl border-2 border-dashed border-cyan-500/30 overflow-hidden backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-pink-500/5 animate-pulse"></div>
              <div className="relative h-full flex flex-col items-center justify-center gap-6 p-8 text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center animate-scale-in">
                  <UploadIcon className="w-12 h-12 text-cyan-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    Upload Your Video
                  </h3>
                  <p className="text-sm text-gray-400">
                    Start creating amazing content
                  </p>
                </div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:scale-105 transition-all"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <UploadIcon className="w-4 h-4 mr-2" />
                      Choose Video
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500">
                  Supports MP4, MOV, AVI • Max 500MB
                </p>
              </div>
            </div>
          ) : (
            <div className="relative max-w-[400px] w-full aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl border border-cyan-500/30">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 pointer-events-none z-10"></div>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                style={getVideoStyle()}
                src={videoUrl}
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
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 backdrop-blur-md pointer-events-auto opacity-0 hover:opacity-100 transition-all hover:scale-110 border border-white/20"
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <Pause className="w-10 h-10 text-white" />
                  ) : (
                    <Play className="w-10 h-10 ml-1 text-white" />
                  )}
                </Button>
              </div>
              
              {/* Replace Video Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-4 right-4 z-30 bg-black/50 backdrop-blur-sm hover:bg-black/70 border border-white/20"
              >
                <RotateCw className="w-4 h-4 mr-2" />
                Replace
              </Button>
            </div>
          )}
        </div>

        {/* Advanced Editing Tools */}
        <div className="fixed lg:relative bottom-[72px] lg:bottom-0 left-0 right-0 lg:w-[420px] bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 backdrop-blur-xl border-t lg:border-l border-cyan-500/20 overflow-y-auto max-h-[40vh] lg:max-h-none z-40">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none"></div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full relative">
            <TabsList className="w-full grid grid-cols-4 bg-gradient-to-r from-gray-900 to-black border-b border-cyan-500/20 sticky top-0 z-10 backdrop-blur-xl">
              <TabsTrigger value="trim" className="flex flex-col gap-1 data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-cyan-400 transition-all">
                <Scissors className="w-4 h-4" />
                <span className="text-xs font-medium">Trim</span>
              </TabsTrigger>
              <TabsTrigger value="filters" className="flex flex-col gap-1 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500/20 data-[state=active]:to-pink-500/20 data-[state=active]:text-purple-400 transition-all">
                <Wand2 className="w-4 h-4" />
                <span className="text-xs font-medium">Filters</span>
              </TabsTrigger>
              <TabsTrigger value="text" className="flex flex-col gap-1 data-[state=active]:bg-gradient-to-br data-[state=active]:from-pink-500/20 data-[state=active]:to-orange-500/20 data-[state=active]:text-pink-400 transition-all">
                <Type className="w-4 h-4" />
                <span className="text-xs font-medium">Text</span>
              </TabsTrigger>
              <TabsTrigger value="adjust" className="flex flex-col gap-1 data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500/20 data-[state=active]:to-yellow-500/20 data-[state=active]:text-orange-400 transition-all">
                <Palette className="w-4 h-4" />
                <span className="text-xs font-medium">Adjust</span>
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
                <h3 className="text-sm font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Visual Filters
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {filters.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => applyFilter(filter.id)}
                      disabled={!videoUrl}
                      className={cn(
                        "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all group overflow-hidden",
                        selectedFilter === filter.id
                          ? "border-purple-500 bg-gradient-to-br from-purple-500/20 to-pink-500/20 shadow-lg shadow-purple-500/50"
                          : "border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-600",
                        !videoUrl && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/10 group-hover:to-pink-500/10 transition-all"></div>
                      <filter.icon className="w-6 h-6 relative z-10 text-purple-400" />
                      <span className="text-xs font-medium relative z-10">{filter.name}</span>
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold flex items-center gap-2 text-cyan-400">
                      <Sun className="w-4 h-4" />
                      Brightness
                    </label>
                    <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 font-mono">
                      {brightness}%
                    </Badge>
                  </div>
                  <Slider
                    value={[brightness]}
                    onValueChange={(v) => setBrightness(v[0])}
                    disabled={!videoUrl}
                    min={0}
                    max={200}
                    step={1}
                    className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-cyan-500 [&_[role=slider]]:to-purple-500"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold flex items-center gap-2 text-purple-400">
                      <Contrast className="w-4 h-4" />
                      Contrast
                    </label>
                    <Badge variant="outline" className="border-purple-500/30 text-purple-400 font-mono">
                      {contrast}%
                    </Badge>
                  </div>
                  <Slider
                    value={[contrast]}
                    onValueChange={(v) => setContrast(v[0])}
                    disabled={!videoUrl}
                    min={0}
                    max={200}
                    step={1}
                    className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-purple-500 [&_[role=slider]]:to-pink-500"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold flex items-center gap-2 text-pink-400">
                      <Droplets className="w-4 h-4" />
                      Saturation
                    </label>
                    <Badge variant="outline" className="border-pink-500/30 text-pink-400 font-mono">
                      {saturation}%
                    </Badge>
                  </div>
                  <Slider
                    value={[saturation]}
                    onValueChange={(v) => setSaturation(v[0])}
                    disabled={!videoUrl}
                    min={0}
                    max={200}
                    step={1}
                    className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-pink-500 [&_[role=slider]]:to-orange-500"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold flex items-center gap-2 text-orange-400">
                      <Sparkles className="w-4 h-4" />
                      Blur
                    </label>
                    <Badge variant="outline" className="border-orange-500/30 text-orange-400 font-mono">
                      {blur}px
                    </Badge>
                  </div>
                  <Slider
                    value={[blur]}
                    onValueChange={(v) => setBlur(v[0])}
                    disabled={!videoUrl}
                    min={0}
                    max={10}
                    step={0.5}
                    className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-orange-500 [&_[role=slider]]:to-yellow-500"
                  />
                </div>

                <Button
                  variant="outline"
                  className="w-full bg-gradient-to-r from-gray-800 to-gray-900 border-gray-700 hover:border-cyan-500/50 transition-all"
                  onClick={() => {
                    setBrightness(100);
                    setContrast(100);
                    setSaturation(100);
                    setBlur(0);
                    toast.success("Reset to defaults");
                  }}
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Reset All Adjustments
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
