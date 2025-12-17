import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  X, Settings, ChevronDown, Play, Pause, Undo2, Redo2, Plus, Music, Type, 
  Mic, Captions, Layers, Sparkles, Sticker, ArrowRight, Image, Search, 
  Bookmark, Import, ChevronUp, Trash2, Check, AtSign, Users
} from "lucide-react";
import { toast } from "sonner";
import { usePowerfulUpload } from "@/hooks/usePowerfulUpload";
import { useAutoMusicExtraction } from "@/hooks/useAutoMusicExtraction";
import { compressVideo, needsCompression, getFileSizeMB } from "@/lib/videoCompression";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { PeopleMentionPicker } from "@/components/story/PeopleMentionPicker";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { SegmentedTimeline } from "@/components/reel-editor/SegmentedTimeline";

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

interface TaggedPerson {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

type ActiveTool = 'none' | 'text' | 'sticker' | 'audio' | 'overlay' | 'edit' | 'captions' | 'voiceover' | 'tag';

const CreateReel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'edits' | 'drafts' | 'templates'>('edits');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<MediaItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [clipDuration, setClipDuration] = useState(30); // Default 30 sec, max 60 sec
  const [isPlaying, setIsPlaying] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>('none');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Music state
  const [musicTab, setMusicTab] = useState<'foryou' | 'trending' | 'original' | 'saved'>('foryou');
  const [musicSearch, setMusicSearch] = useState("");
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [musicVolume, setMusicVolume] = useState(80); // 0-100
  const [originalVolume, setOriginalVolume] = useState(0); // Muted by default when music selected
  
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
  
  // People tagging state
  const [taggedPeople, setTaggedPeople] = useState<TaggedPerson[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const { uploadState, uploadSingle } = usePowerfulUpload();
  const { extractAndAnalyzeAudio } = useAutoMusicExtraction();

  // Check if current media is image
  const isImageMode = selectedItems.length > 0 && selectedItems[0]?.type === 'image';

  // Set duration for images
  useEffect(() => {
    if (isImageMode && showEditor) {
      setDuration(clipDuration);
    }
  }, [isImageMode, showEditor, clipDuration]);

  // Sync audio with video playback
  useEffect(() => {
    if (!audioRef.current || !selectedMusic?.preview_audio) return;
    audioRef.current.src = selectedMusic.preview_audio;
    audioRef.current.volume = musicVolume / 100;
    audioRef.current.load();
  }, [selectedMusic]);

  // Sync music volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = musicVolume / 100;
    }
  }, [musicVolume]);

  // Sync video volume (original audio)
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = originalVolume / 100;
    }
  }, [originalVolume]);

  // Animate playhead during playback (for both video and image)
  useEffect(() => {
    if (isImageMode && isPlaying) {
      // For images, use interval to simulate playback
      const startTime = Date.now() - (currentTime * 1000);
      
      playbackIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed >= clipDuration) {
          setCurrentTime(0);
          setIsPlaying(false);
          audioRef.current?.pause();
          if (audioRef.current) audioRef.current.currentTime = 0;
          if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
        } else {
          setCurrentTime(elapsed);
        }
      }, 50);

      return () => {
        if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      };
    } else if (!isImageMode && isPlaying) {
      // For videos, use animation frame
      const updatePlayhead = () => {
        if (videoRef.current && isPlaying) {
          setCurrentTime(videoRef.current.currentTime);
          animationFrameRef.current = requestAnimationFrame(updatePlayhead);
        }
      };
      animationFrameRef.current = requestAnimationFrame(updatePlayhead);

      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
    }
  }, [isPlaying, isImageMode, clipDuration]);

  // Handle play/pause for both video/image and audio
  const togglePlayback = useCallback(() => {
    if (isImageMode) {
      // For images, just control audio and playhead
      if (isPlaying) {
        audioRef.current?.pause();
        if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      } else {
        if (audioRef.current && selectedMusic) {
          audioRef.current.currentTime = currentTime;
          audioRef.current.play();
        }
      }
      setIsPlaying(!isPlaying);
    } else if (videoRef.current) {
      // For videos
      if (isPlaying) {
        videoRef.current.pause();
        audioRef.current?.pause();
      } else {
        videoRef.current.play();
        if (audioRef.current && selectedMusic) {
          audioRef.current.currentTime = videoRef.current.currentTime;
          audioRef.current.play();
        }
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying, selectedMusic, isImageMode, currentTime]);

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

  // Fetch music tracks from Music Box
  useEffect(() => {
    if (activeTool === 'audio') {
      fetchMusicTracks();
    }
  }, [activeTool, musicTab, musicSearch]);

  const fetchMusicTracks = async () => {
    try {
      let query = supabase
        .from('music_tracks')
        .select('*')
        .eq('status', 'approved');

      // Filter by tab
      if (musicTab === 'original') {
        query = query.contains('tags', ['extracted']);
      } else if (musicTab === 'trending') {
        query = query.order('created_at', { ascending: false });
      }

      // Search filter
      if (musicSearch) {
        query = query.or(`title.ilike.%${musicSearch}%,artist.ilike.%${musicSearch}%`);
      }

      const { data, error } = await query.limit(50);

      if (!error && data) {
        // Get reel counts for each track
        const tracksWithCounts = await Promise.all(data.map(async (track: any) => {
          const { count } = await supabase
            .from('reels')
            .select('*', { count: 'exact', head: true })
            .eq('music_url', track.original_url);
          
          return {
            id: track.id,
            track_id: track.id,
            title: track.title,
            artist: track.artist || 'Unknown Artist',
            duration: track.duration_sec?.toString() || '30',
            preview_url: null, // No cover image for extracted tracks
            spotify_url: null,
            preview_audio: track.original_url,
            reel_count: count && count > 0 ? `${count} reels` : 'New'
          };
        }));
        
        setMusicTracks(tracksWithCounts);
      }
    } catch (error) {
      console.error('Error fetching music:', error);
    }
  };

  // Auto-trigger file picker immediately on mount (unless preloaded media is provided)
  useEffect(() => {
    const state = (location.state ?? {}) as any;
    const stateUrl: string | null =
      state?.preloadedMedia?.url ||
      state?.preloadedImage ||
      state?.preloadedVideo ||
      null;

    const queryImage = searchParams.get('image');
    const queryVideo = searchParams.get('video');
    const url = stateUrl || queryImage || queryVideo;

    if (url) {
      const stateType = state?.preloadedMedia?.type as MediaItem['type'] | undefined;
      const type: MediaItem['type'] = (queryVideo ? 'video' : stateType) || (state?.preloadedVideo ? 'video' : 'image');

      const item: MediaItem = {
        id: `${Date.now()}-preloaded`,
        url,
        type,
        selected: false,
        order: 0,
      };

      setMediaItems([item]);
      setSelectedItems([{ ...item, order: 1 }]);
      setShowEditor(true);
      return;
    }

    const storedMedia = sessionStorage.getItem('reelMedia');
    if (storedMedia) {
      try {
        const fileData = JSON.parse(storedMedia);
        const items: MediaItem[] = fileData.map((file: any, index: number) => ({
          id: `${Date.now()}-${index}`,
          url: file.url,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          selected: false,
          order: index,
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
  }, [location.state, searchParams]);

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

      const firstItem = selectedItems[0];
      const isImage = firstItem.type === 'image';

      const response = await fetch(firstItem.url);
      const blob = await response.blob();
      
      let fileToUpload: File;
      let mediaUrl: string;

      if (isImage) {
        // For images, upload directly as image
        fileToUpload = new File([blob], `reel-${Date.now()}.png`, { type: 'image/png' });
        toast.info("Creating reel from image...");
      } else {
        // For videos, handle compression
        fileToUpload = new File([blob], 'reel.mp4', { type: 'video/mp4' });
        
        if (needsCompression(fileToUpload)) {
          toast.info(`Compressing ${getFileSizeMB(fileToUpload).toFixed(1)}MB video...`);
          fileToUpload = await compressVideo(fileToUpload, 45);
        }
      }

      const result = await uploadSingle('reels', user.id, fileToUpload);
      
      if (result.error) throw result.error;

      // Insert the reel
      const { data: reelData, error: reelError } = await supabase.from("reels").insert({
        user_id: user.id,
        video_url: result.publicUrl,
        caption: captionText || "",
        thumbnail_url: result.publicUrl,
        music_url: selectedMusic?.preview_audio || null,
        duration: clipDuration,
        is_image_reel: isImage,
      }).select('id').single();

      if (reelError) throw reelError;

      // Save tagged people if any
      if (taggedPeople.length > 0 && reelData?.id) {
        const tagsToInsert = taggedPeople.map(person => ({
          reel_id: reelData.id,
          tagged_user_id: person.id,
          tagged_by_user_id: user.id,
        }));
        
        await supabase.from("reel_tags").insert(tagsToInsert);
      }

      toast.success("Reel published!");
      if (!isImage) {
        extractAndAnalyzeAudio(result.publicUrl, 'reel');
      }
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
    { id: 'tag' as ActiveTool, icon: AtSign, label: 'Tag' },
    { id: 'text' as ActiveTool, icon: Type, label: 'Text' },
    { id: 'sticker' as ActiveTool, icon: Sticker, label: 'Sticker' },
    { id: 'audio' as ActiveTool, icon: Music, label: 'Audio' },
    { id: 'overlay' as ActiveTool, icon: Plus, label: 'Clips' },
    { id: 'edit' as ActiveTool, icon: Sparkles, label: 'Filters' },
    { id: 'voiceover' as ActiveTool, icon: Mic, label: 'Voice' },
    { id: 'captions' as ActiveTool, icon: Captions, label: 'Captions' },
  ];

  const closeTool = () => setActiveTool('none');

  if (showEditor && selectedItems.length > 0) {
    const mainVideo = selectedItems.find(i => i.type === 'video') || selectedItems[0];
    
    return (
      <div className="fixed inset-0 bg-black flex flex-col z-50 overflow-hidden safe-bottom">
        {/* Transparent Header */}
        <AnimatePresence>
          {!isFullscreen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2 z-30"
            >
              <button 
                onClick={() => setShowEditor(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm">
                <span className="text-white text-sm font-medium">New project</span>
                <ChevronDown className="w-4 h-4 text-white/60" />
              </div>
              
              <button 
                onClick={handlePublish}
                disabled={isUploading}
                className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 disabled:opacity-50 transition-all"
              >
                {isUploading ? 'Exporting...' : 'Export'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fullscreen Video Preview */}
        <motion.div
          className="flex-1 flex items-center justify-center"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
        >
          <div 
            className={`relative overflow-hidden transition-all duration-300 ${
              isFullscreen ? 'w-full h-full' : 'w-full max-w-[280px] aspect-[9/16] rounded-xl'
            }`}
            style={getFilterStyle()}
          >
            {/* Hidden Audio Element for Music */}
            <audio ref={audioRef} className="hidden" loop />
            
            {mainVideo.type === 'video' ? (
              <video
                ref={videoRef}
                src={mainVideo.url}
                className="w-full h-full object-cover"
                playsInline
                muted={selectedMusic ? originalVolume === 0 : false}
                onLoadedMetadata={(e) => {
                  setDuration(e.currentTarget.duration);
                  e.currentTarget.volume = originalVolume / 100;
                }}
                onTimeUpdate={(e) => {
                  const time = e.currentTarget.currentTime;
                  setCurrentTime(time);
                  if (time >= clipDuration && videoRef.current) {
                    videoRef.current.pause();
                    videoRef.current.currentTime = 0;
                    audioRef.current?.pause();
                    if (audioRef.current) audioRef.current.currentTime = 0;
                    setCurrentTime(0);
                    setIsPlaying(false);
                  }
                }}
                onClick={togglePlayback}
              />
            ) : (
              <div className="relative w-full h-full cursor-pointer" onClick={togglePlayback}>
                <img src={mainVideo.url} alt="" className="w-full h-full object-cover" />
                <AnimatePresence>
                  {!isPlaying && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                        <Play className="w-7 h-7 text-white fill-white ml-0.5" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {isPlaying && (
                  <div className="absolute top-3 right-3 w-7 h-7">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="14" fill="none" stroke="white" strokeOpacity="0.3" strokeWidth="2" />
                      <circle 
                        cx="16" cy="16" r="14" fill="none" stroke="white" strokeWidth="2"
                        strokeDasharray={`${(currentTime / clipDuration) * 88} 88`}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
            )}
            
            {/* Text Overlays */}
            {textOverlays.map((overlay) => (
              <div
                key={overlay.id}
                className="absolute pointer-events-none"
                style={{
                  left: overlay.x,
                  top: overlay.y,
                  fontSize: overlay.fontSize * 0.5,
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
                  fontSize: sticker.size * 0.5,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {sticker.content}
              </div>
            ))}

            {/* Tagged People Indicator */}
            {taggedPeople.length > 0 && (
              <button 
                onClick={() => setActiveTool('tag')}
                className="absolute bottom-16 left-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/50 backdrop-blur-sm rounded-full"
              >
                <Users className="w-3.5 h-3.5 text-white" />
                <span className="text-white text-xs font-medium">{taggedPeople.length}</span>
              </button>
            )}

            {/* Selected Music Indicator */}
            {selectedMusic && (
              <div className="absolute bottom-3 left-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-3 py-2 flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center animate-spin" style={{ animationDuration: '3s' }}>
                  <Music className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="text-white text-xs truncate flex-1">{selectedMusic.title} - {selectedMusic.artist}</span>
              </div>
            )}
            
            {isFullscreen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center"
              >
                <ChevronUp className="w-5 h-5 text-white/50 animate-bounce" />
                <span className="text-white/50 text-xs">Swipe up to edit</span>
              </motion.div>
            )}
          </div>
        </motion.div>

          {/* Timeline & Tools */}
          <AnimatePresence>
            {!isFullscreen && activeTool === 'none' && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="absolute bottom-0 left-0 right-0 pb-safe"
              >
                {/* Duration Slider */}
                <div className="px-4 py-3 bg-gradient-to-t from-black via-black/90 to-transparent">
                  <div className="flex items-center justify-between text-xs text-white/50 mb-2">
                    <span>Duration</span>
                    <span className={clipDuration === 30 ? 'text-amber-400' : 'text-white/70'}>
                      {clipDuration}s {clipDuration === 30 && '(recommended)'}
                    </span>
                  </div>
                  <Slider
                    value={[clipDuration]}
                    onValueChange={([val]) => setClipDuration(val)}
                    min={5}
                    max={60}
                    step={1}
                    className="w-full [&_[role=slider]]:bg-amber-400 [&_[role=slider]]:border-0"
                  />
                  <div className="flex justify-between text-[10px] text-white/30 mt-1">
                    <span>5s</span>
                    <span>30s</span>
                    <span>60s</span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="px-4 py-2 bg-black">
                  <div className="flex items-center justify-center gap-6">
                    <button 
                      onClick={togglePlayback}
                      className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 text-white fill-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
                    </button>
                    
                    <div className="text-center font-mono text-sm">
                      <span className="text-white">{formatTime(currentTime)}</span>
                      <span className="text-white/30 mx-1">/</span>
                      <span className="text-white/50">{formatTime(Math.min(duration, clipDuration))}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                        <Undo2 className="w-4 h-4 text-white/50" />
                      </button>
                      <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                        <Redo2 className="w-4 h-4 text-white/50" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Segmented Timeline Track */}
                <SegmentedTimeline
                  currentTime={currentTime}
                  duration={duration}
                  clipDuration={clipDuration}
                  thumbnailUrl={mainVideo.url}
                  isVideo={mainVideo.type === 'video'}
                  onSeek={(time) => {
                    if (videoRef.current && mainVideo.type === 'video') {
                      videoRef.current.currentTime = time;
                    }
                    if (audioRef.current && selectedMusic) {
                      audioRef.current.currentTime = time;
                    }
                    setCurrentTime(time);
                  }}
                />

                {/* Quick Access Buttons */}
                <div className="px-4 py-3 bg-black flex gap-2">
                  <button 
                    onClick={() => setActiveTool('audio')}
                    className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-white/5 rounded-xl"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                      <Music className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-xs text-white/60 truncate">
                      {selectedMusic ? selectedMusic.title : 'Add audio'}
                    </span>
                  </button>
                  <button 
                    onClick={() => setActiveTool('tag')}
                    className="flex items-center gap-2 px-3 py-2.5 bg-white/5 rounded-xl"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                      <AtSign className="w-3.5 h-3.5 text-white" />
                    </div>
                    {taggedPeople.length > 0 && (
                      <span className="text-xs text-white/60">{taggedPeople.length}</span>
                    )}
                  </button>
                </div>

                {/* Editor Tools */}
                <div className="px-2 py-3 bg-black border-t border-white/5">
                  <ScrollArea className="w-full">
                    <div className="flex items-center gap-1 px-2 min-w-max">
                      {editorTools.map((tool) => {
                        const IconComponent = tool.icon;
                        const isActive = activeTool === tool.id;
                        return (
                          <button
                            key={tool.id}
                            onClick={() => setActiveTool(tool.id)}
                            className={`flex flex-col items-center gap-1 min-w-[52px] p-2 rounded-xl transition-colors ${
                              isActive ? 'bg-white/10' : 'hover:bg-white/5'
                            }`}
                          >
                            <IconComponent className={`w-5 h-5 ${isActive ? 'text-white' : 'text-white/60'}`} />
                            <span className={`text-[9px] ${isActive ? 'text-white' : 'text-white/40'}`}>{tool.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        {/* Tool Bottom Sheets */}
        <AnimatePresence>
          {activeTool !== 'none' && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100) closeTool();
              }}
              className="absolute bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl rounded-t-[28px] max-h-[65vh] overflow-hidden z-20 border-t border-white/10"
            >
              {/* Handle */}
              <div className="flex flex-col items-center pt-3 pb-2">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>
              
              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-3">
                <button onClick={closeTool} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <X className="w-4 h-4 text-white/70" />
                </button>
                <button onClick={closeTool} className="px-4 py-1.5 bg-white text-black text-sm font-semibold rounded-full">
                  Done
                </button>
              </div>

              <ScrollArea className="max-h-[50vh]">
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
                      {/* Volume Controls - Show when music selected */}
                      {selectedMusic && (
                        <div className="bg-zinc-800/50 rounded-xl p-4 space-y-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                              <Music className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{selectedMusic.title}</p>
                              <p className="text-white/50 text-xs">{selectedMusic.artist}</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setSelectedMusic(null)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-xs text-white/60 mb-2">
                              <span>Music Volume</span>
                              <span>{musicVolume}%</span>
                            </div>
                            <Slider
                              value={[musicVolume]}
                              onValueChange={([val]) => setMusicVolume(val)}
                              min={0}
                              max={100}
                              step={1}
                              className="w-full [&_[role=slider]]:bg-pink-500 [&_[role=slider]]:border-0"
                            />
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-xs text-white/60 mb-2">
                              <span>Original Audio</span>
                              <span>{originalVolume}%</span>
                            </div>
                            <Slider
                              value={[originalVolume]}
                              onValueChange={([val]) => setOriginalVolume(val)}
                              min={0}
                              max={100}
                              step={1}
                              className="w-full [&_[role=slider]]:bg-white [&_[role=slider]]:border-0"
                            />
                          </div>
                        </div>
                      )}

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

                      <div className="space-y-1 max-h-[200px] overflow-y-auto">
                        {musicTracks.filter(t => 
                          !musicSearch || t.title.toLowerCase().includes(musicSearch.toLowerCase())
                        ).map((track) => (
                          <div 
                            key={track.id}
                            onClick={() => {
                              setSelectedMusic(track);
                              toast.success(`Added: ${track.title}`);
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

                  {/* TAG PEOPLE TOOL */}
                  {activeTool === 'tag' && (
                    <div className="space-y-4">
                      <h3 className="text-white font-semibold text-lg">Tag People</h3>
                      <p className="text-white/60 text-sm">Tag your followers and following to notify them about this reel</p>
                      
                      <Button 
                        onClick={() => setShowTagPicker(true)} 
                        className="w-full gap-2 bg-zinc-800 hover:bg-zinc-700"
                      >
                        <AtSign className="w-5 h-5" /> Select people to tag
                      </Button>
                      
                      {taggedPeople.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-white/60 text-sm">Tagged ({taggedPeople.length})</h4>
                          <div className="space-y-2">
                            {taggedPeople.map((person) => (
                              <div key={person.id} className="flex items-center justify-between bg-zinc-800 p-3 rounded-xl">
                                <div className="flex items-center gap-3">
                                  <OptimizedAvatar
                                    src={person.avatar_url}
                                    alt={person.full_name || "User"}
                                    className="w-10 h-10"
                                  />
                                  <div>
                                    <p className="text-white font-medium text-sm">{person.full_name || 'User'}</p>
                                    <p className="text-white/50 text-xs">@{person.username || 'user'}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setTaggedPeople(prev => prev.filter(p => p.id !== person.id))}
                                  className="w-8 h-8 rounded-full bg-zinc-700 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                                >
                                  <X className="w-4 h-4 text-white/60" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
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

        {/* People Tag Picker Dialog */}
        <PeopleMentionPicker
          open={showTagPicker}
          onOpenChange={setShowTagPicker}
          selectedPeople={taggedPeople}
          onSelect={(people) => setTaggedPeople(people)}
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
            <button onClick={() => navigate('/create/post')} className="text-white/40 text-sm font-medium hover:text-white/60 transition-colors">POST</button>
            <button onClick={() => navigate('/create/story')} className="text-white/40 text-sm font-medium hover:text-white/60 transition-colors">STORY</button>
            <button className="text-white text-sm font-semibold">REEL</button>
            <button onClick={() => navigate('/live')} className="text-white/40 text-sm font-medium hover:text-white/60 transition-colors">LIVE</button>
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
