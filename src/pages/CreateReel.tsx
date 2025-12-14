import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X, Settings, ChevronDown, Play, Pause, Undo2, Redo2, Plus, Volume2, Music, Type, Mic, Captions, Layers, Sparkles, UserMinus, Sticker, ArrowRight, Image, Search, Bookmark, Import, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { usePowerfulUpload } from "@/hooks/usePowerfulUpload";
import { useAutoMusicExtraction } from "@/hooks/useAutoMusicExtraction";
import { compressVideo, needsCompression, getFileSizeMB } from "@/lib/videoCompression";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence, useDragControls, PanInfo } from "framer-motion";

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
  const [showMusicSheet, setShowMusicSheet] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [musicTab, setMusicTab] = useState<'foryou' | 'trending' | 'original' | 'saved'>('foryou');
  const [musicSearch, setMusicSearch] = useState("");
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { uploadState, uploadSingle } = usePowerfulUpload();
  const { extractAndAnalyzeAudio } = useAutoMusicExtraction();

  // Fetch music tracks
  useEffect(() => {
    if (showMusicSheet) {
      fetchMusicTracks();
    }
  }, [showMusicSheet, musicTab]);

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
        caption: "",
        thumbnail_url: result.publicUrl,
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
      // Swiped up - show editing tools
      setIsFullscreen(false);
    } else if (info.offset.y > 50) {
      // Swiped down - go fullscreen
      setIsFullscreen(true);
      setShowMusicSheet(false);
    }
  };

  // Editor Tools
  const editorTools = [
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'sticker', icon: Sticker, label: 'Sticker' },
    { id: 'audio', icon: Music, label: 'Audio', action: () => setShowMusicSheet(true) },
    { id: 'clips', icon: Plus, label: 'Add clips' },
    { id: 'overlay', icon: Layers, label: 'Overlay' },
    { id: 'edit', icon: Sparkles, label: 'Edit' },
    { id: 'captions', icon: Captions, label: 'Captions' },
  ];

  if (showEditor && selectedItems.length > 0) {
    const mainVideo = selectedItems.find(i => i.type === 'video') || selectedItems[0];
    
    return (
      <div ref={containerRef} className="fixed inset-0 bg-black flex flex-col z-50 overflow-hidden">
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
                
                <div className="flex items-center gap-3">
                  <span className="text-white/60 text-sm">2K</span>
                  <Button 
                    onClick={handlePublish}
                    disabled={isUploading}
                    className="bg-white text-black hover:bg-white/90 rounded-full px-5 font-semibold"
                  >
                    {isUploading ? 'Exporting...' : 'Export'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Video Preview - Expands when fullscreen */}
          <motion.div 
            className="flex-1 flex items-center justify-center px-4 py-2 overflow-hidden"
            animate={{ 
              paddingTop: isFullscreen ? 60 : 8,
              paddingBottom: isFullscreen ? 60 : 8 
            }}
            transition={{ duration: 0.3 }}
          >
            <div className={`relative bg-black rounded-lg overflow-hidden transition-all duration-300 ${
              isFullscreen ? 'w-full h-full' : 'w-full max-w-sm aspect-[9/16]'
            }`}>
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
                <img 
                  src={mainVideo.url} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Fullscreen indicator - swipe up hint */}
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

          {/* Timeline & Tools - Hide when fullscreen */}
          <AnimatePresence>
            {!isFullscreen && !showMusicSheet && (
              <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ duration: 0.3 }}
              >
                {/* Timeline Controls */}
                <div className="px-4 py-3 bg-black/80">
                  <div className="flex items-center justify-center gap-4 text-white/80 text-sm">
                    <Button 
                      variant="ghost" 
                      size="icon" 
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
                      className="text-white hover:bg-white/10"
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6 fill-white" />
                      ) : (
                        <Play className="w-6 h-6" />
                      )}
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
                  <div className="flex items-center gap-1 text-[10px] text-white/40 mb-1">
                    <span>•</span>
                    <span className="mx-4">1s</span>
                    <span>•</span>
                    <span className="mx-4">3s</span>
                    <span>•</span>
                  </div>
                  
                  {/* Video Track */}
                  <div className="relative">
                    <div className="flex gap-0.5 overflow-x-auto py-1">
                      {selectedItems.map((item) => (
                        <div 
                          key={item.id}
                          className="w-16 h-12 flex-shrink-0 rounded overflow-hidden border border-white/20"
                        >
                          {item.type === 'video' ? (
                            <video src={item.url} className="w-full h-full object-cover" muted />
                          ) : (
                            <img src={item.url} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Playhead */}
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white pointer-events-none" />
                    
                    {/* Trim handles */}
                    <div className="absolute top-0 bottom-0 left-0 w-2 bg-white/80 rounded-l flex items-center justify-center">
                      <div className="w-0.5 h-4 bg-black/50 rounded" />
                    </div>
                    <div className="absolute top-0 bottom-0 right-0 w-2 bg-white/80 rounded-r flex items-center justify-center">
                      <div className="w-0.5 h-4 bg-black/50 rounded" />
                    </div>
                  </div>
                </div>

                {/* Audio Track Placeholder */}
                <div 
                  className="px-4 py-3 bg-zinc-900/60 border-t border-white/5 flex items-center gap-2 text-white/40 cursor-pointer hover:bg-zinc-900/80 transition-colors"
                  onClick={() => setShowMusicSheet(true)}
                >
                  <Music className="w-4 h-4" />
                  <span className="text-sm">Tap to add audio</span>
                </div>

                {/* Text Track Placeholder */}
                <div className="px-4 py-3 bg-zinc-900/40 border-t border-white/5 flex items-center gap-2 text-white/40">
                  <Type className="w-4 h-4 font-bold" />
                  <span className="text-sm">Tap to add text</span>
                </div>

                {/* Tip */}
                <div className="px-4 py-2 bg-zinc-900/40 text-center">
                  <span className="text-white/40 text-xs">Tap on a track to trim. Pinch to zoom.</span>
                </div>

                {/* Editor Tools */}
                <div className="px-2 py-4 bg-black border-t border-white/10">
                  <div className="flex items-center justify-around overflow-x-auto gap-1 scrollbar-hide">
                    {editorTools.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={tool.action}
                        className="flex flex-col items-center gap-1.5 min-w-[60px] p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <tool.icon className="w-6 h-6 text-white/80" />
                        <span className="text-[10px] text-white/60">{tool.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Music Bottom Sheet */}
        <AnimatePresence>
          {showMusicSheet && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100) {
                  setShowMusicSheet(false);
                }
              }}
              className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-3xl max-h-[70vh] overflow-hidden z-10"
            >
              {/* Handle */}
              <div className="flex justify-center py-3">
                <div className="w-12 h-1 bg-white/30 rounded-full" />
              </div>

              {/* Search & Import */}
              <div className="px-4 pb-3 flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    placeholder="Search audio"
                    value={musicSearch}
                    onChange={(e) => setMusicSearch(e.target.value)}
                    className="bg-zinc-800 border-0 pl-10 text-white placeholder:text-white/40 rounded-xl h-10"
                  />
                </div>
                <Button variant="ghost" className="bg-zinc-800 text-white rounded-xl gap-2 px-4">
                  <Import className="w-4 h-4" />
                  Import
                </Button>
              </div>

              {/* Tabs */}
              <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
                {[
                  { id: 'foryou', label: 'For you' },
                  { id: 'trending', label: 'Trending' },
                  { id: 'original', label: 'Original audio' },
                  { id: 'saved', label: 'Saved' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setMusicTab(tab.id as typeof musicTab)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      musicTab === tab.id
                        ? 'bg-white text-black'
                        : 'bg-zinc-800 text-white/70 hover:bg-zinc-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Featured Track Card */}
              {musicTracks[0] && (
                <div className="px-4 pb-4">
                  <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 p-4 flex items-end h-32">
                    {musicTracks[0].preview_url && (
                      <img 
                        src={musicTracks[0].preview_url} 
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-60"
                      />
                    )}
                    <div className="relative z-10">
                      <h3 className="text-white font-bold text-lg">{musicTracks[0].title}</h3>
                      <p className="text-white/80 text-sm">{musicTracks[0].artist}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Track List */}
              <ScrollArea className="flex-1 max-h-[35vh]">
                <div className="px-4 space-y-1">
                  {musicTracks.slice(1).map((track) => (
                    <div 
                      key={track.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
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
                        <p className="text-white/50 text-xs truncate">
                          {track.artist} · {track.reel_count} · {Math.floor(parseInt(track.duration) / 60)}:{(parseInt(track.duration) % 60).toString().padStart(2, '0')}
                        </p>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-white/60 hover:text-white"
                      >
                        <Bookmark className="w-5 h-5" />
                      </Button>
                    </div>
                  ))}
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

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="text-white hover:bg-white/10"
        >
          <X className="w-6 h-6" />
        </Button>
        
        <h1 className="text-white font-semibold text-lg">New reel</h1>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white hover:bg-white/10"
        >
          <Settings className="w-6 h-6" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 py-2">
        <button
          onClick={() => setActiveTab('edits')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'edits' 
              ? 'bg-white/10 text-white' 
              : 'text-white/60 hover:text-white'
          }`}
        >
          <div className="w-4 h-4 rounded bg-gradient-to-r from-pink-500 to-purple-500" />
          Edits
        </button>
        
        <button
          onClick={() => setActiveTab('drafts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'drafts' 
              ? 'bg-white/10 text-white' 
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Plus className="w-4 h-4" />
          Drafts · 5
        </button>
        
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeTab === 'templates' 
              ? 'bg-white/10 text-white' 
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          Templates
        </button>
      </div>

      {/* Recents Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button className="flex items-center gap-2 text-white">
          <span className="text-lg font-semibold">Recents</span>
          <ChevronDown className="w-5 h-5" />
        </button>
        
        <Button 
          variant="ghost" 
          size="icon"
          className="text-white/60 hover:bg-white/10"
        >
          <Layers className="w-5 h-5" />
        </Button>
      </div>

      {/* Media Grid */}
      <div className="flex-1 overflow-y-auto px-1">
        <div className="grid grid-cols-3 gap-0.5">
          {/* Camera/Add Button */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="aspect-[3/4] bg-zinc-900 flex flex-col items-center justify-center gap-2 hover:bg-zinc-800 transition-colors"
          >
            <div className="w-14 h-14 rounded-full border-2 border-white/40 flex items-center justify-center">
              <Image className="w-7 h-7 text-white/60" />
            </div>
          </button>

          {/* Media Items */}
          {mediaItems.map((item) => {
            const isSelected = selectedItems.find(i => i.id === item.id);
            const selectionOrder = selectedItems.findIndex(i => i.id === item.id) + 1;
            
            return (
              <button
                key={item.id}
                onClick={() => toggleItemSelection(item)}
                className="aspect-[3/4] relative overflow-hidden group"
              >
                {item.type === 'video' ? (
                  <video 
                    src={item.url} 
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <img 
                    src={item.url} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Selection Circle */}
                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected 
                    ? 'bg-primary border-primary' 
                    : 'border-white/60 bg-black/20'
                }`}>
                  {isSelected && (
                    <span className="text-white text-xs font-bold">{selectionOrder}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Empty State - prompt to add media */}
        {mediaItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-white/60">
            <Image className="w-16 h-16 mb-4 opacity-40" />
            <p className="text-center">Tap the camera to add videos or images</p>
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="bg-black border-t border-white/10">
        {/* Selected Items Preview */}
        {selectedItems.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
            {selectedItems.map((item) => (
              <div key={item.id} className="relative w-12 h-12 rounded overflow-hidden">
                {item.type === 'video' ? (
                  <video src={item.url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={() => removeSelectedItem(item.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-black rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Content Type Tabs & Next Button */}
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <button className="text-white/40 text-sm font-medium">POST</button>
            <button className="text-white/40 text-sm font-medium">STORY</button>
            <button className="text-white text-sm font-semibold">REEL</button>
            <button className="text-white/40 text-sm font-medium">LIVE</button>
          </div>
          
          <Button
            onClick={handleNext}
            disabled={selectedItems.length === 0}
            className="bg-primary hover:bg-primary/90 text-white rounded-full px-6 py-2 flex items-center gap-2"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

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
};

export default CreateReel;
