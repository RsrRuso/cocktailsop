import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X, Settings, ChevronDown, Play, Undo2, Redo2, Plus, Volume2, Music, Type, Mic, Captions, Layers, Sparkles, UserMinus, Sticker, ArrowRight, Check, Image } from "lucide-react";
import { toast } from "sonner";
import { usePowerfulUpload } from "@/hooks/usePowerfulUpload";
import { useAutoMusicExtraction } from "@/hooks/useAutoMusicExtraction";
import { compressVideo, needsCompression, getFileSizeMB } from "@/lib/videoCompression";
import { Progress } from "@/components/ui/progress";

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  duration?: number;
  selected: boolean;
  order: number;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { uploadState, uploadSingle } = usePowerfulUpload();
  const { extractAndAnalyzeAudio } = useAutoMusicExtraction();

  // Auto-trigger file picker on mount
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
      // Trigger file picker automatically
      const timer = setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
      return () => clearTimeout(timer);
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

      // For now, upload first selected video
      const firstVideo = selectedItems.find(i => i.type === 'video');
      if (!firstVideo) {
        toast.error("Please select at least one video");
        setIsUploading(false);
        return;
      }

      // Fetch the blob from the object URL
      const response = await fetch(firstVideo.url);
      const blob = await response.blob();
      const file = new File([blob], 'reel.mp4', { type: 'video/mp4' });

      let videoToUpload = file;

      // Compress if needed
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

  // Editor Tools
  const editorTools = [
    { id: 'audio', icon: Music, label: 'Audio' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'voice', icon: Mic, label: 'Voice' },
    { id: 'captions', icon: Captions, label: 'Captions' },
    { id: 'overlay', icon: Layers, label: 'Overlay' },
    { id: 'effects', icon: Sparkles, label: 'Sound FX' },
    { id: 'cutout', icon: UserMinus, label: 'Cutout' },
    { id: 'sticker', icon: Sticker, label: 'Sticker' },
  ];

  if (showEditor && selectedItems.length > 0) {
    const mainVideo = selectedItems.find(i => i.type === 'video') || selectedItems[0];
    
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80">
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
        </div>

        {/* Video Preview */}
        <div className="flex-1 flex items-center justify-center px-4 py-2 overflow-hidden">
          <div className="relative w-full max-w-sm aspect-[9/16] bg-black rounded-lg overflow-hidden">
            {mainVideo.type === 'video' ? (
              <video
                ref={videoRef}
                src={mainVideo.url}
                className="w-full h-full object-cover"
                playsInline
                loop
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              />
            ) : (
              <img 
                src={mainVideo.url} 
                alt="" 
                className="w-full h-full object-cover"
              />
            )}
          </div>
        </div>

        {/* Timeline Controls */}
        <div className="px-4 py-3 bg-black/80">
          <div className="flex items-center justify-center gap-6 text-white/80 text-sm">
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
              <Play className={`w-6 h-6 ${isPlaying ? 'fill-white' : ''}`} />
            </Button>
            
            <div className="text-center">
              <span className="text-white font-mono">{formatTime(currentTime)}</span>
              <span className="text-white/40 font-mono mx-1">/</span>
              <span className="text-white/60 font-mono">{formatTime(duration)}</span>
            </div>
            
            <span className="text-white/40">|</span>
            <span>1s</span>
            <span className="text-white/40">|</span>
            
            <Button variant="ghost" size="icon" className="text-white/60 hover:bg-white/10">
              <Undo2 className="w-5 h-5" />
              <span className="text-xs ml-1">2s</span>
            </Button>
            
            <Button variant="ghost" size="icon" className="text-white/60 hover:bg-white/10">
              <Redo2 className="w-5 h-5" />
              <span className="text-xs ml-1">3s</span>
            </Button>
          </div>
        </div>

        {/* Add Audio Button */}
        <div className="px-4 py-2 bg-zinc-900/80">
          <Button 
            variant="ghost" 
            className="text-white/80 hover:bg-white/10 gap-2"
          >
            <Plus className="w-5 h-5" />
            Add audio
          </Button>
        </div>

        {/* Timeline Thumbnails */}
        <div className="px-4 py-3 bg-zinc-900">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-white/60 hover:bg-white/10 flex-shrink-0">
              <Volume2 className="w-5 h-5" />
            </Button>
            
            <div className="flex-1 flex gap-0.5 overflow-x-auto">
              {selectedItems.map((item, idx) => (
                <div 
                  key={item.id}
                  className="w-12 h-16 flex-shrink-0 rounded overflow-hidden border-2 border-white/20"
                >
                  {item.type === 'video' ? (
                    <video src={item.url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => fileInputRef.current?.click()}
              className="bg-white text-black hover:bg-white/90 rounded-lg flex-shrink-0"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Editor Tools */}
        <div className="px-2 py-4 bg-black border-t border-white/10">
          <div className="flex items-center justify-around overflow-x-auto gap-1 scrollbar-hide">
            {editorTools.map((tool) => (
              <button
                key={tool.id}
                className="flex flex-col items-center gap-1.5 min-w-[60px] p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <tool.icon className="w-6 h-6 text-white/80" />
                <span className="text-[10px] text-white/60">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        {uploadState.isUploading && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
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
