import { useState, useRef, useCallback, useEffect } from 'react';
import { EditorTool } from '@/pages/ReelEditorPro';

export interface VideoState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  playbackSpeed: number;
  trimStart: number;
  trimEnd: number;
}

export interface Filters {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  preset: string;
}

export interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  fade: number;
  vignette: number;
}

export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  animation: string;
}

export interface Sticker {
  id: string;
  type: 'emoji' | 'gif';
  content: string;
  x: number;
  y: number;
  size: number;
}

export interface Drawing {
  id: string;
  paths: { x: number; y: number }[][];
  color: string;
  width: number;
}

export interface AudioSettings {
  musicUrl: string | null;
  musicVolume: number;
  originalAudioVolume: number;
  voiceoverUrl: string | null;
  voiceoverVolume: number;
}

export type LayoutMode = 'single' | 'side-by-side' | 'pip' | 'grid';

export function useVideoEditor(initialVideoUrl?: string) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [activeTool, setActiveTool] = useState<EditorTool>('none');
  
  const [videoState, setVideoState] = useState<VideoState>({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    volume: 1,
    playbackSpeed: 1,
    trimStart: 0,
    trimEnd: 0,
  });

  const [filters, setFilters] = useState<Filters>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    preset: 'none',
  });

  const [adjustments, setAdjustments] = useState<Adjustments>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    warmth: 0,
    fade: 0,
    vignette: 0,
  });

  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    musicUrl: null,
    musicVolume: 0.5,
    originalAudioVolume: 1,
    voiceoverUrl: null,
    voiceoverVolume: 1,
  });

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('single');

  // Initialize video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setVideoState(prev => ({
        ...prev,
        duration: video.duration,
        trimEnd: video.duration,
      }));
    };

    const handleTimeUpdate = () => {
      setVideoState(prev => ({
        ...prev,
        currentTime: video.currentTime,
      }));
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  const updateVideoState = useCallback((updates: Partial<VideoState>) => {
    setVideoState(prev => ({ ...prev, ...updates }));
    
    const video = videoRef.current;
    if (!video) return;

    if (updates.playbackSpeed !== undefined) {
      video.playbackRate = updates.playbackSpeed;
    }
    if (updates.volume !== undefined) {
      video.volume = updates.volume;
    }
    if (updates.currentTime !== undefined) {
      video.currentTime = updates.currentTime;
    }
  }, []);

  const updateFilters = useCallback((updates: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  const updateAdjustments = useCallback((updates: Partial<Adjustments>) => {
    setAdjustments(prev => ({ ...prev, ...updates }));
  }, []);

  const addTextOverlay = useCallback((text: TextOverlay) => {
    setTextOverlays(prev => [...prev, text]);
  }, []);

  const updateTextOverlay = useCallback((id: string, updates: Partial<TextOverlay>) => {
    setTextOverlays(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const removeTextOverlay = useCallback((id: string) => {
    setTextOverlays(prev => prev.filter(t => t.id !== id));
  }, []);

  const addSticker = useCallback((sticker: Sticker) => {
    setStickers(prev => [...prev, sticker]);
  }, []);

  const removeSticker = useCallback((id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
  }, []);

  const addDrawing = useCallback((drawing: Drawing) => {
    setDrawings(prev => [...prev, drawing]);
  }, []);

  const clearDrawings = useCallback(() => {
    setDrawings([]);
  }, []);

  const updateAudioSettings = useCallback((updates: Partial<AudioSettings>) => {
    setAudioSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const updateLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutMode(mode);
  }, []);

  const exportVideo = useCallback(async () => {
    // Export implementation would use canvas.captureStream() and MediaRecorder
    // This is a placeholder for the actual export logic
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        console.log('Exporting video with settings:', {
          videoState,
          filters,
          adjustments,
          textOverlays,
          stickers,
          drawings,
          audioSettings,
          layoutMode,
        });
        resolve();
      }, 2000);
    });
  }, [videoState, filters, adjustments, textOverlays, stickers, drawings, audioSettings, layoutMode]);

  return {
    videoRef,
    canvasRef,
    activeTool,
    setActiveTool,
    videoState,
    filters,
    adjustments,
    textOverlays,
    stickers,
    drawings,
    audioSettings,
    layoutMode,
    updateVideoState,
    updateFilters,
    updateAdjustments,
    addTextOverlay,
    updateTextOverlay,
    removeTextOverlay,
    addSticker,
    removeSticker,
    addDrawing,
    clearDrawings,
    updateAudioSettings,
    updateLayoutMode,
    exportVideo,
  };
}
