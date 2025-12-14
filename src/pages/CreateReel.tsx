import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  X, Settings, ChevronDown, Play, Pause, Undo2, Redo2, Plus, Music, Type, 
  Mic, Captions, Layers, Sparkles, Sticker, ArrowRight, Image, Search, 
  Bookmark, Import, ChevronUp, Trash2, Check
} from "lucide-react";
import { toast } from "sonner";
import { usePowerfulUpload } from "@/hooks/usePowerfulUpload";
import { useAutoMusicExtraction } from "@/hooks/useAutoMusicExtraction";
import { compressVideo, needsCompression, getFileSizeMB } from "@/lib/videoCompression";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  duration?: number;
  selected: boolean;
  order: number;
}

interface MusicTrack {
  id: string;
  track_id: string;
  title: string;
  artist: string;
  duration: string;
  preview_url: string | null;
  spotify_url?: string;
  preview_audio?: string | null;
  reel_count?: string;
}

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  animation: string;
}

interface StickerItem {
  id: string;
  content: string;
  x: number;
  y: number;
  size: number;
}

interface Filters {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  preset: string;
}

type ActiveTool = 'none' | 'text' | 'sticker' | 'audio' | 'overlay' | 'edit' | 'captions' | 'voiceover';

const CreateReel = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'edits' | 'drafts' | 'templates'>('edits');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<MediaItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>('none');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Music state
  const [musicTab, setMusicTab] = useState<'foryou' | 'trending' | 'original' | 'saved'>('foryou');
  const [musicSearch, setMusicSearch] = useState("");
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  
  // Text state
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [newText, setNewText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontSize, setFontSize] = useState(48);
  const [fontFamily, setFontFamily] = useState('Impact');
  const [textAnimation, setTextAnimation] = useState('None');
  
  // Sticker state
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  
  // Filter state
  const [filters, setFilters] = useState<Filters>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    preset: 'none'
  });
  
  // Voiceover state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(null);
  
  // Captions state
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [captionText, setCaptionText] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { uploadState, uploadSingle } = usePowerfulUpload();
  const { extractAndAnalyzeAudio } = useAutoMusicExtraction();

  const fonts = ['Arial', 'Impact', 'Comic Sans MS', 'Courier New', 'Georgia', 'Times New Roman'];
  const animations = ['None', 'Fade In', 'Slide Up', 'Bounce', 'Pop'];
  const emojiList = ['😀', '😂', '❤️', '🔥', '👍', '🎉', '💯', '✨', '🌟', '💪', '🙌', '👏', '🎵', '🎨', '🍕', '☕', '🎬', '🎥', '📸', '🎭'];
  
  const filterPresets = [
    { name: 'None', preset: 'none', style: { brightness: 100, contrast: 100, saturation: 100 } },
    { name: 'Valencia', preset: 'valencia', style: { brightness: 110, contrast: 105, saturation: 110 } },
    { name: 'Lo-fi', preset: 'lofi', style: { brightness: 95, contrast: 120, saturation: 110 } },
    { name: 'Clarendon', preset: 'clarendon', style: { brightness: 110, contrast: 125, saturation: 130 } },
    { name: 'Moon', preset: 'moon', style: { brightness: 110, contrast: 110, saturation: 0 } },
    { name: 'Lark', preset: 'lark', style: { brightness: 115, contrast: 90, saturation: 120 } },
  ];

  // Fetch music tracks
  useEffect(() => {
    if (activeTool === 'audio') {
      fetchMusicTracks();
    }
  }, [activeTool, musicTab]);

  const fetchMusicTracks = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_music_library')
        .select('*')
        .eq('is_active', true)
        .order('popularity_score', { ascending: false })
        .limit(50);

      if (!error && data) {
        setMusicTracks(data.map((track: any) => ({
          id: track.id,
          track_id: track.track_id,
          title: track.title,
          artist: track.artist,
          duration: track.duration_seconds?.toString() || '0',
          preview_url: track.cover_image_url,
          spotify_url: track.spotify_url,
          preview_audio: track.preview_url,
          reel_count: `${Math.floor(Math.random() * 500)}K reels`
        })));
      }
    } catch (error) {
      console.error('Error fetching music:', error);
    }
  };

  // Auto-trigger file picker immediately on mount
  useEffect(() => {
    const storedMedia = sessionStorage.getItem('reelMedia');
    if (storedMedia) {
      try {
        const fileData = JSON.parse(storedMedia);
        const items: MediaItem[] = fileData.map((file: any, index: number) => ({
          id: `${Date.now()}-${index}`,
          url: file.url,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          selected: false,
          order: index
        }));
        setMediaItems(items);
        if (items.length > 0) {
          setSelectedItems([{ ...items[0], order: 1 }]);
          setShowEditor(true);
        }
        sessionStorage.removeItem('reelMedia');
      } catch (e) {
        console.error('Error parsing stored media:', e);
      }
    } else {
      fileInputRef.current?.click();
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach((file, index) => {
      if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) {
        toast.error("Please select video or image files");
        return;
      }

      const url = URL.createObjectURL(file);
      const newItem: MediaItem = {
        id: `${Date.now()}-${index}`,
        url,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        selected: false,
        order: mediaItems.length + index
      };

      setMediaItems(prev => [newItem, ...prev]);
    });
  }, [mediaItems.length]);

  const toggleItemSelection = (item: MediaItem) => {
    const isSelected = selectedItems.find(i => i.id === item.id);
    
    if (isSelected) {
      setSelectedItems(prev => prev.filter(i => i.id !== item.id));
    } else {
      setSelectedItems(prev => [...prev, { ...item, order: prev.length + 1 }]);
    }
  };

  const removeSelectedItem = (id: string) => {
    setSelectedItems(prev => prev.filter(i => i.id !== id));
  };

  const handleNext = () => {
    if (selectedItems.length === 0) {
      toast.error("Please select at least one video or image");
      return;
    }
    setShowEditor(true);
  };

  const handlePublish = async () => {
    if (selectedItems.length === 0) return;
    
    setIsUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const firstVideo = selectedItems.find(i => i.type === 'video');
      if (!firstVideo) {
        toast.error("Please select at least one video");
        setIsUploading(false);
        return;
      }

      const response = await fetch(firstVideo.url);
      const blob = await response.blob();
      const file = new File([blob], 'reel.mp4', { type: 'video/mp4' });

      let videoToUpload = file;

      if (needsCompression(file)) {
        toast.info(`Compressing ${getFileSizeMB(file).toFixed(1)}MB video...`);
        videoToUpload = await compressVideo(file, 45);
      }

      const result = await uploadSingle('reels', user.id, videoToUpload);
      
      if (result.error) throw result.error;

      await supabase.from("reels").insert({
        user_id: user.id,
        video_url: result.publicUrl,
        caption: captionText || "",
        thumbnail_url: result.publicUrl,
        music_url: selectedMusic?.preview_audio || null,
      });

      toast.success("Reel uploaded!");
      extractAndAnalyzeAudio(result.publicUrl, 'reel');
      navigate("/reels");
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y < -50) {
      setIsFullscreen(false);
    } else if (info.offset.y > 50) {
      setIsFullscreen(true);
      setActiveTool('none');
    }
  };

  // Text functions
  const addTextOverlay = () => {
    if (!newText.trim()) return;
    setTextOverlays(prev => [...prev, {
      id: Date.now().toString(),
      text: newText,
      x: 160,
      y: 280,
      fontSize,
      color: textColor,
      fontFamily,
      animation: textAnimation,
    }]);
    setNewText('');
    toast.success("Text added!");
  };

  const removeTextOverlay = (id: string) => {
    setTextOverlays(prev => prev.filter(t => t.id !== id));
  };

  // Sticker functions
  const addSticker = (emoji: string) => {
    setStickers(prev => [...prev, {
      id: Date.now().toString(),
      content: emoji,
      x: 160,
      y: 280,
      size: 64,
    }]);
    toast.success("Sticker added!");
  };

  const removeSticker = (id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
  };

  // Voiceover functions
  const startVoiceover = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setVoiceoverUrl(URL.createObjectURL(blob));
        toast.success("Voiceover recorded!");
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast.error("Microphone access denied");
    }
  };

  const stopVoiceover = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Filter style
  const getFilterStyle = () => ({
    filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) hue-rotate(${filters.hue}deg)`
  });

  // Editor Tools
  const editorTools = [
    { id: 'text' as ActiveTool, icon: Type, label: 'Text' },
    { id: 'sticker' as ActiveTool, icon: Sticker, label: 'Sticker' },
    { id: 'audio' as ActiveTool, icon: Music, label: 'Audio' },
    { id: 'overlay' as ActiveTool, icon: Plus, label: 'Add clips' },
    { id: 'edit' as ActiveTool, icon: Sparkles, label: 'Filters' },
    { id: 'voiceover' as ActiveTool, icon: Mic, label: 'Voice' },
    { id: 'captions' as ActiveTool, icon: Captions, label: 'Captions' },
  ];

  const closeTool = () => setActiveTool('none');

  if (showEditor && selectedItems.length > 0) {
    const mainVideo = selectedItems.find(i => i.type === 'video') || selectedItems[0];
    
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50 overflow-hidden">
        {/* Swipeable Content */}
        <motion.div
          className="flex-1 flex flex-col"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
        >
          {/* Header */}
          <AnimatePresence>
            {!isFullscreen && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-center justify-between px-4 py-3 bg-black/80"
              >
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowEditor(false)}
                  className="text-white hover:bg-white/10"
                >
                  <X className="w-6 h-6" />
                </Button>
                
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">New project</span>
                  <ChevronDown className="w-4 h-4 text-white/60" />
                </div>
                
                <Button 
                  onClick={handlePublish}
                  disabled={isUploading}
                  className="bg-white text-black hover:bg-white/90 rounded-full px-5 font-semibold"
                >
                  {isUploading ? 'Exporting...' : 'Export'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Video Preview */}
          <motion.div 
            className="flex-1 flex items-center justify-center px-4 py-2 overflow-hidden"
            animate={{ 
              paddingTop: isFullscreen ? 60 : 8,
              paddingBottom: isFullscreen ? 60 : 8 
            }}
          >
            <div 
              className={`relative bg-black rounded-lg overflow-hidden transition-all duration-300 ${
                isFullscreen ? 'w-full h-full' : 'w-full max-w-sm aspect-[9/16]'
              }`}
              style={getFilterStyle()}
            >
              {mainVideo.type === 'video' ? (
                <video
                  ref={videoRef}
                  src={mainVideo.url}
                  className="w-full h-full object-cover"
                  playsInline
                  loop
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onClick={() => {
                    if (videoRef.current) {
                      if (isPlaying) {
                        videoRef.current.pause();
                      } else {
                        videoRef.current.play();
                      }
                      setIsPlaying(!isPlaying);
                    }
                  }}
                />
              ) : (
                <img src={mainVideo.url} alt="" className="w-full h-full object-cover" />
              )}
              
              {/* Text Overlays */}
              {textOverlays.map((overlay) => (
                <div
                  key={overlay.id}
                  className="absolute pointer-events-none"
                  style={{
                    left: overlay.x,
                    top: overlay.y,
                    fontSize: overlay.fontSize,
                    color: overlay.color,
                    fontFamily: overlay.fontFamily,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  {overlay.text}
                </div>
              ))}
              
              {/* Stickers */}
              {stickers.map((sticker) => (
                <div
                  key={sticker.id}
                  className="absolute pointer-events-none"
                  style={{
                    left: sticker.x,
                    top: sticker.y,
                    fontSize: sticker.size,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  {sticker.content}
                </div>
              ))}

              {/* Selected Music Indicator */}
              {selectedMusic && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-2 flex items-center gap-2">
                  <Music className="w-4 h-4 text-white" />
                  <span className="text-white text-sm truncate">{selectedMusic.title} - {selectedMusic.artist}</span>
                </div>
              )}
              
              {isFullscreen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center"
                >
                  <ChevronUp className="w-6 h-6 text-white/60 animate-bounce" />
                  <span className="text-white/60 text-xs">Swipe up to edit</span>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Timeline & Tools */}
          <AnimatePresence>
            {!isFullscreen && activeTool === 'none' && (
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
              >
                {/* Timeline Controls */}
                <div className="px-4 py-3 bg-black/80">
                  <div className="flex items-center justify-center gap-4 text-white/80 text-sm">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        if (videoRef.current) {
                          if (isPlaying) videoRef.current.pause();
                          else videoRef.current.play();
                          setIsPlaying(!isPlaying);
                        }
                      }}
                      className="text-white hover:bg-white/10"
                    >
                      {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6" />}
                    </Button>
                    
                    <div className="text-center">
                      <span className="text-white font-mono">{formatTime(currentTime)}</span>
                      <span className="text-white/40 font-mono mx-1">/</span>
                      <span className="text-white/60 font-mono">{formatTime(duration)}</span>
                    </div>
                    
                    <Button variant="ghost" size="icon" className="text-white/60 hover:bg-white/10">
                      <Undo2 className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white/60 hover:bg-white/10">
                      <Redo2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                {/* Timeline Track */}
                <div className="px-4 py-2 bg-zinc-900/80">
                  <div className="relative">
                    <div className="flex gap-0.5 overflow-x-auto py-1">
                      {selectedItems.map((item) => (
                        <div key={item.id} className="w-16 h-12 flex-shrink-0 rounded overflow-hidden border border-white/20">
                          {item.type === 'video' ? (
                            <video src={item.url} className="w-full h-full object-cover" muted />
                          ) : (
                            <img src={item.url} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white pointer-events-none" />
                  </div>
                </div>

                {/* Audio Track */}
                <div 
                  className="px-4 py-3 bg-zinc-900/60 border-t border-white/5 flex items-center gap-2 cursor-pointer hover:bg-zinc-900/80"
                  onClick={() => setActiveTool('audio')}
                >
                  <Music className="w-4 h-4 text-white/40" />
                  <span className="text-sm text-white/40">
                    {selectedMusic ? `${selectedMusic.title} - ${selectedMusic.artist}` : 'Tap to add audio'}
                  </span>
                </div>

                {/* Text Track */}
                <div 
                  className="px-4 py-3 bg-zinc-900/40 border-t border-white/5 flex items-center gap-2 cursor-pointer hover:bg-zinc-900/60"
                  onClick={() => setActiveTool('text')}
                >
                  <Type className="w-4 h-4 text-white/40" />
                  <span className="text-sm text-white/40">
                    {textOverlays.length > 0 ? `${textOverlays.length} text overlay(s)` : 'Tap to add text'}
                  </span>
                </div>

                {/* Editor Tools */}
                <div className="px-2 py-4 bg-black border-t border-white/10">
                  <div className="flex items-center justify-around overflow-x-auto gap-1 scrollbar-hide">
                    {editorTools.map((tool) => {
                      const IconComponent = tool.icon;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => setActiveTool(tool.id)}
                          className="flex flex-col items-center gap-1.5 min-w-[60px] p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <IconComponent className="w-6 h-6 text-white/80" />
                          <span className="text-[10px] text-white/60">{tool.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Tool Bottom Sheets */}
        <AnimatePresence>
          {activeTool !== 'none' && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100) closeTool();
              }}
              className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-3xl max-h-[70vh] overflow-hidden z-10"
            >
              {/* Handle */}
              <div className="flex justify-center py-3">
                <div className="w-12 h-1 bg-white/30 rounded-full" />
              </div>

              <ScrollArea className="max-h-[60vh]">
                <div className="px-4 pb-8">
                  {/* TEXT TOOL */}
                  {activeTool === 'text' && (
                    <div className="space-y-4">
                      <h3 className="text-white font-semibold text-lg">Add Text</h3>
                      
                      <Input
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        placeholder="Enter text..."
                        className="bg-zinc-800 border-0 text-white"
                      />
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-white/60 text-sm mb-1 block">Font</label>
                          <Select value={fontFamily} onValueChange={setFontFamily}>
                            <SelectTrigger className="bg-zinc-800 border-0 text-white">
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
                          <label className="text-white/60 text-sm mb-1 block">Size</label>
                          <Input
                            type="number"
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                            className="bg-zinc-800 border-0 text-white"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-white/60 text-sm mb-1 block">Color</label>
                          <Input
                            type="color"
                            value={textColor}
                            onChange={(e) => setTextColor(e.target.value)}
                            className="bg-zinc-800 border-0 h-10"
                          />
                        </div>
                        <div>
                          <label className="text-white/60 text-sm mb-1 block">Animation</label>
                          <Select value={textAnimation} onValueChange={setTextAnimation}>
                            <SelectTrigger className="bg-zinc-800 border-0 text-white">
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
                      
                      <Button onClick={addTextOverlay} className="w-full gap-2">
                        <Plus className="w-4 h-4" /> Add Text
                      </Button>
                      
                      {textOverlays.length > 0 && (
                        <div className="space-y-2 mt-4">
                          <h4 className="text-white/60 text-sm">Added Text</h4>
                          {textOverlays.map((t) => (
                            <div key={t.id} className="flex items-center justify-between bg-zinc-800 p-2 rounded">
                              <span className="text-white text-sm truncate">{t.text}</span>
                              <Button variant="ghost" size="sm" onClick={() => removeTextOverlay(t.id)}>
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* STICKER TOOL */}
                  {activeTool === 'sticker' && (
                    <div className="space-y-4">
                      <h3 className="text-white font-semibold text-lg">Stickers & Emojis</h3>
                      
                      <div className="grid grid-cols-5 gap-2">
                        {emojiList.map((emoji) => (
                          <Button
                            key={emoji}
                            variant="outline"
                            onClick={() => addSticker(emoji)}
                            className="text-2xl p-3 h-auto bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                          >
                            {emoji}
                          </Button>
                        ))}
                      </div>
                      
                      {stickers.length > 0 && (
                        <div className="space-y-2 mt-4">
                          <h4 className="text-white/60 text-sm">Added Stickers</h4>
                          {stickers.map((s) => (
                            <div key={s.id} className="flex items-center justify-between bg-zinc-800 p-2 rounded">
                              <span className="text-2xl">{s.content}</span>
                              <Button variant="ghost" size="sm" onClick={() => removeSticker(s.id)}>
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AUDIO/MUSIC TOOL */}
                  {activeTool === 'audio' && (
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                          <Input
                            placeholder="Search audio"
                            value={musicSearch}
                            onChange={(e) => setMusicSearch(e.target.value)}
                            className="bg-zinc-800 border-0 pl-10 text-white"
                          />
                        </div>
                        <Button variant="ghost" className="bg-zinc-800 text-white gap-2">
                          <Import className="w-4 h-4" /> Import
                        </Button>
                      </div>

                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {['foryou', 'trending', 'original', 'saved'].map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setMusicTab(tab as typeof musicTab)}
                            className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
                              musicTab === tab ? 'bg-white text-black' : 'bg-zinc-800 text-white/70'
                            }`}
                          >
                            {tab === 'foryou' ? 'For you' : tab === 'original' ? 'Original audio' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-1">
                        {musicTracks.filter(t => 
                          !musicSearch || t.title.toLowerCase().includes(musicSearch.toLowerCase())
                        ).map((track) => (
                          <div 
                            key={track.id}
                            onClick={() => {
                              setSelectedMusic(track);
                              toast.success(`Added: ${track.title}`);
                              closeTool();
                            }}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                              selectedMusic?.id === track.id ? 'bg-primary/20' : 'hover:bg-white/5'
                            }`}
                          >
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                              {track.preview_url ? (
                                <img src={track.preview_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Music className="w-5 h-5 text-white/40" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-medium text-sm truncate">{track.title}</h4>
                              <p className="text-white/50 text-xs truncate">{track.artist} · {track.reel_count}</p>
                            </div>
                            {selectedMusic?.id === track.id && <Check className="w-5 h-5 text-primary" />}
                            <Bookmark className="w-5 h-5 text-white/40" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FILTER/EDIT TOOL */}
                  {activeTool === 'edit' && (
                    <div className="space-y-4">
                      <h3 className="text-white font-semibold text-lg">Filters & Adjustments</h3>
                      
                      <div className="grid grid-cols-3 gap-2">
                        {filterPresets.map((preset) => (
                          <Button
                            key={preset.preset}
                            variant={filters.preset === preset.preset ? 'default' : 'outline'}
                            onClick={() => setFilters({ ...preset.style, hue: 0, preset: preset.preset })}
                            className="h-auto py-3 bg-zinc-800 border-zinc-700"
                          >
                            {preset.name}
                          </Button>
                        ))}
                      </div>
                      
                      <div className="space-y-4 pt-4">
                        <div>
                          <div className="flex justify-between text-sm text-white/60 mb-2">
                            <span>Brightness</span><span>{filters.brightness}%</span>
                          </div>
                          <Slider value={[filters.brightness]} min={0} max={200} onValueChange={([v]) => setFilters(f => ({ ...f, brightness: v }))} />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm text-white/60 mb-2">
                            <span>Contrast</span><span>{filters.contrast}%</span>
                          </div>
                          <Slider value={[filters.contrast]} min={0} max={200} onValueChange={([v]) => setFilters(f => ({ ...f, contrast: v }))} />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm text-white/60 mb-2">
                            <span>Saturation</span><span>{filters.saturation}%</span>
                          </div>
                          <Slider value={[filters.saturation]} min={0} max={200} onValueChange={([v]) => setFilters(f => ({ ...f, saturation: v }))} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VOICEOVER TOOL */}
                  {activeTool === 'voiceover' && (
                    <div className="space-y-4">
                      <h3 className="text-white font-semibold text-lg">Voiceover</h3>
                      
                      <div className="flex flex-col items-center py-8">
                        <Button
                          size="lg"
                          onClick={isRecording ? stopVoiceover : startVoiceover}
                          className={`w-20 h-20 rounded-full ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-primary'}`}
                        >
                          <Mic className="w-8 h-8" />
                        </Button>
                        <p className="text-white/60 mt-4">
                          {isRecording ? 'Recording... Tap to stop' : 'Tap to start recording'}
                        </p>
                      </div>
                      
                      {voiceoverUrl && (
                        <div className="bg-zinc-800 p-4 rounded-lg">
                          <p className="text-white text-sm mb-2">Voiceover recorded</p>
                          <audio src={voiceoverUrl} controls className="w-full" />
                          <Button variant="destructive" size="sm" className="mt-2" onClick={() => setVoiceoverUrl(null)}>
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CAPTIONS TOOL */}
                  {activeTool === 'captions' && (
                    <div className="space-y-4">
                      <h3 className="text-white font-semibold text-lg">Captions</h3>
                      
                      <div className="flex items-center justify-between bg-zinc-800 p-4 rounded-lg">
                        <span className="text-white">Auto-generate captions</span>
                        <Button 
                          variant={captionsEnabled ? 'default' : 'outline'}
                          onClick={() => {
                            setCaptionsEnabled(!captionsEnabled);
                            toast.success(captionsEnabled ? 'Captions disabled' : 'Captions enabled');
                          }}
                        >
                          {captionsEnabled ? 'Enabled' : 'Enable'}
                        </Button>
                      </div>
                      
                      <div>
                        <label className="text-white/60 text-sm mb-2 block">Manual caption</label>
                        <Input
                          value={captionText}
                          onChange={(e) => setCaptionText(e.target.value)}
                          placeholder="Enter caption for your reel..."
                          className="bg-zinc-800 border-0 text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* ADD CLIPS TOOL */}
                  {activeTool === 'overlay' && (
                    <div className="space-y-4">
                      <h3 className="text-white font-semibold text-lg">Add More Clips</h3>
                      
                      <Button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="w-full gap-2 bg-zinc-800 hover:bg-zinc-700"
                      >
                        <Plus className="w-5 h-5" /> Select from gallery
                      </Button>
                      
                      <div className="grid grid-cols-4 gap-2">
                        {selectedItems.map((item) => (
                          <div key={item.id} className="relative aspect-square rounded overflow-hidden">
                            {item.type === 'video' ? (
                              <video src={item.url} className="w-full h-full object-cover" muted />
                            ) : (
                              <img src={item.url} alt="" className="w-full h-full object-cover" />
                            )}
                            <button
                              onClick={() => removeSelectedItem(item.id)}
                              className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        {uploadState.isUploading && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-zinc-900 rounded-2xl p-6 w-80 space-y-4">
              <p className="text-white text-center font-medium">Exporting...</p>
              <Progress value={uploadState.progress} className="h-2" />
              <p className="text-white/60 text-center text-sm">{Math.round(uploadState.progress)}%</p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    );
  }

  // Initial selection view
  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      <div className="flex items-center justify-between px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/10">
          <X className="w-6 h-6" />
        </Button>
        <h1 className="text-white font-semibold text-lg">New reel</h1>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
          <Settings className="w-6 h-6" />
        </Button>
      </div>

      <div className="flex items-center gap-2 px-4 py-2">
        {(['edits', 'drafts', 'templates'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            {tab === 'edits' && <div className="w-4 h-4 rounded bg-gradient-to-r from-pink-500 to-purple-500" />}
            {tab === 'drafts' && <Plus className="w-4 h-4" />}
            {tab === 'templates' && <Layers className="w-4 h-4" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}{tab === 'drafts' && ' · 5'}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <button className="flex items-center gap-2 text-white">
          <span className="text-lg font-semibold">Recents</span>
          <ChevronDown className="w-5 h-5" />
        </button>
        <Button variant="ghost" size="icon" className="text-white/60 hover:bg-white/10">
          <Layers className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-1">
        <div className="grid grid-cols-3 gap-0.5">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="aspect-[3/4] bg-zinc-900 flex flex-col items-center justify-center gap-2 hover:bg-zinc-800 transition-colors"
          >
            <div className="w-14 h-14 rounded-full border-2 border-white/40 flex items-center justify-center">
              <Image className="w-7 h-7 text-white/60" />
            </div>
          </button>

          {mediaItems.map((item) => {
            const isSelected = selectedItems.find(i => i.id === item.id);
            const selectionOrder = selectedItems.findIndex(i => i.id === item.id) + 1;
            
            return (
              <button key={item.id} onClick={() => toggleItemSelection(item)} className="aspect-[3/4] relative overflow-hidden group">
                {item.type === 'video' ? (
                  <video src={item.url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                )}
                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected ? 'bg-primary border-primary' : 'border-white/60 bg-black/20'
                }`}>
                  {isSelected && <span className="text-white text-xs font-bold">{selectionOrder}</span>}
                </div>
              </button>
            );
          })}
        </div>
        
        {mediaItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-white/60">
            <Image className="w-16 h-16 mb-4 opacity-40" />
            <p className="text-center">Tap the camera to add videos or images</p>
          </div>
        )}
      </div>

      <div className="bg-black border-t border-white/10">
        {selectedItems.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
            {selectedItems.map((item) => (
              <div key={item.id} className="relative w-12 h-12 rounded overflow-hidden">
                {item.type === 'video' ? (
                  <video src={item.url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                )}
                <button onClick={() => removeSelectedItem(item.id)} className="absolute -top-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <button className="text-white/40 text-sm font-medium">POST</button>
            <button className="text-white/40 text-sm font-medium">STORY</button>
            <button className="text-white text-sm font-semibold">REEL</button>
            <button className="text-white/40 text-sm font-medium">LIVE</button>
          </div>
          
          <Button onClick={handleNext} disabled={selectedItems.length === 0} className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 py-2 flex items-center gap-2">
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="video/*,image/*" multiple className="hidden" onChange={handleFileSelect} />
    </div>
  );
};

export default CreateReel;
