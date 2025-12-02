import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { 
  Scissors, Gauge, Palette, Volume2, VolumeX, Wand2,
  Download, Loader2, Sparkles, Play, Upload, ExternalLink, Check, ArrowRight
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
  const [activeTab, setActiveTab] = useState<'speed' | 'filter' | 'audio' | 'capcut'>('speed');
  const [selectedSpeed, setSelectedSpeed] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [exportedForCapCut, setExportedForCapCut] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

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

  // Export for CapCut
  const handleExportToCapCut = useCallback(async () => {
    if (!videoUrl) {
      toast.error('No video to export');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const videoBlob = new Blob([blob], { type: 'video/mp4' });
      
      const downloadUrl = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `sv-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
      }, 100);
      
      setExportedForCapCut(true);
      toast.success('Video downloaded! Open it in CapCut');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export video');
    } finally {
      setIsProcessing(false);
    }
  }, [videoUrl]);

  // Open CapCut
  const handleOpenCapCut = useCallback(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      window.location.href = 'capcut://';
      setTimeout(() => {
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isIOS) {
          window.open('https://apps.apple.com/app/capcut-video-editor/id1500855883', '_blank');
        } else {
          window.open('https://play.google.com/store/apps/details?id=com.lemon.lvoverseas', '_blank');
        }
      }, 2000);
    } else {
      window.open('https://www.capcut.com/editor', '_blank');
    }
  }, []);

  // Import from CapCut
  const handleImportFromCapCut = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid video file');
      return;
    }

    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Video file is too large. Maximum 500MB.');
      return;
    }

    setIsProcessing(true);
    try {
      const url = URL.createObjectURL(file);
      onVideoProcessed(url);
      setExportedForCapCut(false);
      toast.success('Video imported successfully!');
    } catch (error) {
      toast.error('Failed to import video');
    } finally {
      setIsProcessing(false);
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    }
  }, [onVideoProcessed]);

  // Quick download
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

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

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
          { id: 'capcut', label: 'CapCut', icon: Wand2 },
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

      {/* CapCut Tab */}
      {activeTab === 'capcut' && (
        <div className="space-y-3">
          {/* Step 1: Export */}
          <Card className={`p-3 transition-all ${!exportedForCapCut ? 'border-primary bg-primary/5' : 'opacity-70'}`}>
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${!exportedForCapCut ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {exportedForCapCut ? <Check className="w-3 h-3" /> : '1'}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">Export Video</h4>
                <p className="text-xs text-muted-foreground mb-2">Download to edit in CapCut</p>
                <Button
                  onClick={handleExportToCapCut}
                  disabled={isProcessing || !videoUrl}
                  variant={exportedForCapCut ? 'outline' : 'default'}
                  size="sm"
                  className="w-full gap-2"
                >
                  {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  {exportedForCapCut ? 'Download Again' : 'Export for CapCut'}
                </Button>
              </div>
            </div>
          </Card>

          <div className="flex justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" />
          </div>

          {/* Step 2: Open CapCut */}
          <Card className={`p-3 transition-all ${exportedForCapCut ? 'border-primary bg-primary/5' : 'opacity-70'}`}>
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${exportedForCapCut ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                2
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">Edit in CapCut</h4>
                <p className="text-xs text-muted-foreground mb-2">Open and import your video</p>
                <Button
                  onClick={handleOpenCapCut}
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                >
                  {isMobile ? 'Open CapCut App' : 'Open CapCut Web'}
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </Card>

          <div className="flex justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" />
          </div>

          {/* Step 3: Import */}
          <Card className="p-3 border-dashed border-2">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">Import Edited Video</h4>
                <p className="text-xs text-muted-foreground mb-2">Bring back your CapCut creation</p>
                <Button
                  onClick={() => importInputRef.current?.click()}
                  disabled={isProcessing}
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                >
                  {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  Import from CapCut
                </Button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleImportFromCapCut}
                />
              </div>
            </div>
          </Card>

          {/* Tips */}
          <div className="bg-muted/50 rounded-lg p-2 text-xs text-muted-foreground">
            <p className="font-medium mb-1">💡 Tips</p>
            <ul className="space-y-0.5">
              <li>• Use CapCut's AI captions</li>
              <li>• Add trending sounds</li>
              <li>• Export in high quality</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab !== 'capcut' && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
          <p className="text-xs font-medium">⚡ Instant Preview</p>
          <p className="text-xs text-muted-foreground">
            Speed and filters apply instantly to preview
          </p>
        </div>
      )}
    </div>
  );
}
