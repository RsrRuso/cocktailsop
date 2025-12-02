import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useFFmpeg } from '@/hooks/useFFmpeg';
import { 
  Scissors, Gauge, Palette, Volume2, VolumeX, RotateCcw,
  Crop, Maximize, Download, Loader2, Sparkles, Zap
} from 'lucide-react';

interface ProEditorToolProps {
  videoUrl: string | null;
  onVideoProcessed: (url: string) => void;
}

const FILTERS = [
  { id: 'none', label: 'Original', icon: '🎬' },
  { id: 'grayscale', label: 'B&W', icon: '⬛' },
  { id: 'sepia', label: 'Sepia', icon: '🟤' },
  { id: 'vintage', label: 'Vintage', icon: '📼' },
  { id: 'cinematic', label: 'Cinema', icon: '🎥' },
  { id: 'contrast', label: 'Contrast', icon: '◐' },
  { id: 'sharpen', label: 'Sharp', icon: '💎' },
  { id: 'vignette', label: 'Vignette', icon: '🔘' },
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
  const { loaded, loading, progress, load, trimVideo, changeSpeed, applyFilter, removeAudio, reverseVideo } = useFFmpeg();
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'speed' | 'filter' | 'audio' | 'effects'>('speed');
  const [selectedSpeed, setSelectedSpeed] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);

  const handleLoadFFmpeg = useCallback(async () => {
    try {
      await load();
      toast.success('Pro Editor ready!');
    } catch (error) {
      toast.error('Failed to load editor');
    }
  }, [load]);

  const handleApplySpeed = useCallback(async () => {
    if (!videoUrl || selectedSpeed === 1) return;
    
    setIsProcessing(true);
    try {
      const result = await changeSpeed(videoUrl, selectedSpeed);
      onVideoProcessed(result);
      toast.success(`Speed changed to ${selectedSpeed}x`);
    } catch (error) {
      console.error('Speed change error:', error);
      toast.error('Failed to change speed');
    } finally {
      setIsProcessing(false);
    }
  }, [videoUrl, selectedSpeed, changeSpeed, onVideoProcessed]);

  const handleApplyFilter = useCallback(async () => {
    if (!videoUrl || selectedFilter === 'none') return;
    
    setIsProcessing(true);
    try {
      const result = await applyFilter(videoUrl, selectedFilter);
      onVideoProcessed(result);
      toast.success(`Filter applied: ${selectedFilter}`);
    } catch (error) {
      console.error('Filter error:', error);
      toast.error('Failed to apply filter');
    } finally {
      setIsProcessing(false);
    }
  }, [videoUrl, selectedFilter, applyFilter, onVideoProcessed]);

  const handleRemoveAudio = useCallback(async () => {
    if (!videoUrl) return;
    
    setIsProcessing(true);
    try {
      const result = await removeAudio(videoUrl);
      onVideoProcessed(result);
      toast.success('Audio removed');
    } catch (error) {
      console.error('Remove audio error:', error);
      toast.error('Failed to remove audio');
    } finally {
      setIsProcessing(false);
    }
  }, [videoUrl, removeAudio, onVideoProcessed]);

  const handleReverseVideo = useCallback(async () => {
    if (!videoUrl) return;
    
    setIsProcessing(true);
    try {
      const result = await reverseVideo(videoUrl);
      onVideoProcessed(result);
      toast.success('Video reversed');
    } catch (error) {
      console.error('Reverse error:', error);
      toast.error('Failed to reverse video');
    } finally {
      setIsProcessing(false);
    }
  }, [videoUrl, reverseVideo, onVideoProcessed]);

  const handleTrimVideo = useCallback(async () => {
    if (!videoUrl) return;
    
    // Get video duration from video element
    const video = document.querySelector('video');
    if (!video) return;
    
    const duration = video.duration;
    const startTime = (trimStart / 100) * duration;
    const endTime = (trimEnd / 100) * duration;
    
    if (startTime >= endTime) {
      toast.error('Invalid trim range');
      return;
    }
    
    setIsProcessing(true);
    try {
      const result = await trimVideo(videoUrl, startTime, endTime);
      onVideoProcessed(result);
      toast.success('Video trimmed');
    } catch (error) {
      console.error('Trim error:', error);
      toast.error('Failed to trim video');
    } finally {
      setIsProcessing(false);
    }
  }, [videoUrl, trimStart, trimEnd, trimVideo, onVideoProcessed]);

  if (!loaded && !loading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-semibold mb-2">Pro Video Editor</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Professional editing powered by FFmpeg - no external apps needed
          </p>
          <Button onClick={handleLoadFFmpeg} className="gap-2">
            <Zap className="w-4 h-4" />
            Initialize Pro Editor
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
            <Gauge className="w-4 h-4" />
            Speed Control
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
            <Palette className="w-4 h-4" />
            Video Filters
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
            <Scissors className="w-4 h-4" />
            Precise Trimming
          </div>
          <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
            <RotateCcw className="w-4 h-4" />
            Reverse Video
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading Pro Editor...</p>
        <p className="text-xs text-muted-foreground mt-2">This may take a moment</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Pro Editor
        </h3>
        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            {progress.message || 'Processing...'}
          </div>
        )}
      </div>

      {isProcessing && (
        <Progress value={progress.progress} className="h-2" />
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        {[
          { id: 'speed', label: 'Speed', icon: Gauge },
          { id: 'filter', label: 'Filter', icon: Palette },
          { id: 'audio', label: 'Audio', icon: Volume2 },
          { id: 'effects', label: 'Effects', icon: Sparkles },
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
            disabled={!videoUrl || isProcessing || selectedSpeed === 1}
            className="w-full gap-2"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gauge className="w-4 h-4" />}
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
                className="flex flex-col gap-1 h-auto py-2"
              >
                <span className="text-lg">{filter.icon}</span>
                <span className="text-xs">{filter.label}</span>
              </Button>
            ))}
          </div>
          <Button 
            onClick={handleApplyFilter} 
            disabled={!videoUrl || isProcessing || selectedFilter === 'none'}
            className="w-full gap-2"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Palette className="w-4 h-4" />}
            Apply Filter
          </Button>
        </Card>
      )}

      {/* Audio Tab */}
      {activeTab === 'audio' && (
        <Card className="p-4 space-y-4">
          <Button 
            onClick={handleRemoveAudio} 
            disabled={!videoUrl || isProcessing}
            variant="outline"
            className="w-full gap-2"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <VolumeX className="w-4 h-4" />}
            Remove Audio
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Use the Audio tool from the toolbar to add new music
          </p>
        </Card>
      )}

      {/* Effects Tab */}
      {activeTab === 'effects' && (
        <Card className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-3 block">Trim Video</label>
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
            <Button 
              onClick={handleTrimVideo} 
              disabled={!videoUrl || isProcessing}
              variant="outline"
              className="w-full gap-2 mt-3"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
              Trim Video
            </Button>
          </div>
          
          <div className="border-t pt-4">
            <Button 
              onClick={handleReverseVideo} 
              disabled={!videoUrl || isProcessing}
              variant="outline"
              className="w-full gap-2"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Reverse Video
            </Button>
          </div>
        </Card>
      )}

      {/* Pro Tips */}
      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
        <p className="text-xs font-medium">💡 Pro Tips</p>
        <ul className="text-xs text-muted-foreground space-y-0.5">
          <li>• Process one effect at a time for best results</li>
          <li>• Speed changes work best between 0.5x - 2x</li>
          <li>• Filters are applied permanently - preview first!</li>
        </ul>
      </div>
    </div>
  );
}
