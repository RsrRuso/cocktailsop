import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { 
  Scissors, Gauge, Palette, Volume2, VolumeX, RotateCcw,
  Download, Loader2, Sparkles, Play, Pause
} from 'lucide-react';

interface ProEditorToolProps {
  videoUrl: string | null;
  onVideoProcessed: (url: string) => void;
}

const FILTERS = [
  { id: 'none', label: 'Original', filter: 'none' },
  { id: 'grayscale', label: 'B&W', filter: 'grayscale(100%)' },
  { id: 'sepia', label: 'Sepia', filter: 'sepia(100%)' },
  { id: 'vintage', label: 'Vintage', filter: 'sepia(50%) contrast(90%) brightness(90%)' },
  { id: 'contrast', label: 'Contrast', filter: 'contrast(130%)' },
  { id: 'bright', label: 'Bright', filter: 'brightness(120%)' },
  { id: 'saturate', label: 'Vivid', filter: 'saturate(150%)' },
  { id: 'blur', label: 'Soft', filter: 'blur(1px)' },
];

const SPEED_PRESETS = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
];

export function ProEditorTool({ videoUrl, onVideoProcessed }: ProEditorToolProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'speed' | 'filter' | 'audio' | 'effects'>('speed');
  const [selectedSpeed, setSelectedSpeed] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [previewFilter, setPreviewFilter] = useState('none');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Apply speed to video preview
  const handleApplySpeed = useCallback(() => {
    const video = document.querySelector('video');
    if (video) {
      video.playbackRate = selectedSpeed;
      toast.success(`Speed set to ${selectedSpeed}x`);
    }
  }, [selectedSpeed]);

  // Apply CSS filter to video preview
  const handleApplyFilter = useCallback(() => {
    const video = document.querySelector('video');
    const filter = FILTERS.find(f => f.id === selectedFilter)?.filter || 'none';
    if (video) {
      video.style.filter = filter;
      setPreviewFilter(filter);
      toast.success(`Filter applied: ${FILTERS.find(f => f.id === selectedFilter)?.label}`);
    }
  }, [selectedFilter]);

  // Mute video
  const handleMuteVideo = useCallback(() => {
    const video = document.querySelector('video');
    if (video) {
      video.muted = true;
      toast.success('Video muted');
    }
  }, []);

  // Unmute video
  const handleUnmuteVideo = useCallback(() => {
    const video = document.querySelector('video');
    if (video) {
      video.muted = false;
      toast.success('Video unmuted');
    }
  }, []);

  // Export with current settings using Canvas + MediaRecorder
  const handleExportVideo = useCallback(async () => {
    if (!videoUrl) return;
    
    setIsProcessing(true);
    toast.info('Preparing export...', { duration: 2000 });

    try {
      // Create offscreen video and canvas
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
        setTimeout(reject, 10000);
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1080;
      canvas.height = video.videoHeight || 1920;
      const ctx = canvas.getContext('2d')!;

      // Calculate trim times
      const duration = video.duration;
      const startTime = (trimStart / 100) * duration;
      const endTime = (trimEnd / 100) * duration;
      const recordDuration = (endTime - startTime) * 1000;

      video.currentTime = startTime;
      video.playbackRate = selectedSpeed;

      // Setup MediaRecorder
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recordingPromise = new Promise<string>((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          resolve(URL.createObjectURL(blob));
        };
      });

      // Start recording
      await video.play();
      mediaRecorder.start();

      // Draw frames with filter
      const filter = FILTERS.find(f => f.id === selectedFilter)?.filter || 'none';
      
      const drawFrame = () => {
        if (video.currentTime >= endTime || video.ended) {
          mediaRecorder.stop();
          video.pause();
          return;
        }
        
        ctx.filter = filter;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawFrame);
      };

      drawFrame();

      // Stop after duration
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          video.pause();
        }
      }, recordDuration / selectedSpeed + 500);

      const exportedUrl = await recordingPromise;
      onVideoProcessed(exportedUrl);
      toast.success('Video exported!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed. Try downloading instead.');
      
      // Fallback: download original
      if (videoUrl) {
        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = `edited-video-${Date.now()}.mp4`;
        a.click();
      }
    } finally {
      setIsProcessing(false);
    }
  }, [videoUrl, selectedSpeed, selectedFilter, trimStart, trimEnd, onVideoProcessed]);

  // Quick download current video
  const handleDownload = useCallback(async () => {
    if (!videoUrl) return;
    
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error) {
      toast.error('Download failed');
    }
  }, [videoUrl]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Pro Editor
        </h3>
        <Button size="sm" variant="outline" onClick={handleDownload} disabled={!videoUrl}>
          <Download className="w-3 h-3 mr-1" />
          Save
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        {[
          { id: 'speed', label: 'Speed', icon: Gauge },
          { id: 'filter', label: 'Filter', icon: Palette },
          { id: 'audio', label: 'Audio', icon: Volume2 },
          { id: 'effects', label: 'Trim', icon: Scissors },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className="flex-1 gap-1 text-xs"
            disabled={isProcessing}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Speed Tab */}
      {activeTab === 'speed' && (
        <Card className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Playback Speed: {selectedSpeed}x
            </label>
            <div className="flex flex-wrap gap-2">
              {SPEED_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={selectedSpeed === preset.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSpeed(preset.value)}
                  disabled={isProcessing}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          <Button 
            onClick={handleApplySpeed} 
            disabled={!videoUrl || isProcessing}
            className="w-full gap-2"
          >
            <Play className="w-4 h-4" />
            Apply Speed
          </Button>
        </Card>
      )}

      {/* Filter Tab */}
      {activeTab === 'filter' && (
        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {FILTERS.map((filter) => (
              <Button
                key={filter.id}
                variant={selectedFilter === filter.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter(filter.id)}
                disabled={isProcessing}
                className="text-xs py-3"
              >
                {filter.label}
              </Button>
            ))}
          </div>
          <Button 
            onClick={handleApplyFilter} 
            disabled={!videoUrl || isProcessing}
            className="w-full gap-2"
          >
            <Palette className="w-4 h-4" />
            Apply Filter
          </Button>
        </Card>
      )}

      {/* Audio Tab */}
      {activeTab === 'audio' && (
        <Card className="p-4 space-y-3">
          <Button 
            onClick={handleMuteVideo} 
            disabled={!videoUrl || isProcessing}
            variant="outline"
            className="w-full gap-2"
          >
            <VolumeX className="w-4 h-4" />
            Mute Audio
          </Button>
          <Button 
            onClick={handleUnmuteVideo} 
            disabled={!videoUrl || isProcessing}
            variant="outline"
            className="w-full gap-2"
          >
            <Volume2 className="w-4 h-4" />
            Unmute Audio
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Use Audio tool from toolbar to add music
          </p>
        </Card>
      )}

      {/* Trim/Effects Tab */}
      {activeTab === 'effects' && (
        <Card className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-3 block">Trim Range</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Start: {trimStart}%</span>
                <span className="flex-1" />
                <span>End: {trimEnd}%</span>
              </div>
              <Slider
                value={[trimStart, trimEnd]}
                onValueChange={([start, end]) => {
                  setTrimStart(start);
                  setTrimEnd(end);
                }}
                min={0}
                max={100}
                step={1}
                disabled={isProcessing}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleExportVideo} 
            disabled={!videoUrl || isProcessing}
            className="w-full gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export with Effects
              </>
            )}
          </Button>
        </Card>
      )}

      {/* Quick Tips */}
      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
        <p className="text-xs font-medium">⚡ Instant Preview</p>
        <p className="text-xs text-muted-foreground">
          Speed and filters apply instantly to preview. Export to save with all effects.
        </p>
      </div>
    </div>
  );
}
