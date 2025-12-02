import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, ExternalLink, Smartphone, Monitor, ArrowRight, Loader2, Wand2, Film, Camera, FileImage } from 'lucide-react';

interface CapCutToolProps {
  videoUrl: string | null;
  onImportVideo: (url: string, destination: 'reel' | 'story' | 'post') => void;
}

export function CapCutTool({ videoUrl, onImportVideo }: CapCutToolProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [hasOpenedCapCut, setHasOpenedCapCut] = useState(false);
  const [importedVideoUrl, setImportedVideoUrl] = useState<string | null>(null);
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Step 1: Open CapCut app or web
  const handleOpenCapCut = useCallback(() => {
    if (isMobile) {
      if (isIOS) {
        window.open('https://apps.apple.com/app/capcut-video-editor/id1500855883', '_blank');
        toast.info('Opening App Store. Open CapCut and create your video!');
      } else {
        window.open('https://play.google.com/store/apps/details?id=com.lemon.lvoverseas', '_blank');
        toast.info('Opening Play Store. Open CapCut and create your video!');
      }
    } else {
      window.open('https://www.capcut.com/editor', '_blank');
      toast.info('CapCut web opened. Create your video there!');
    }
    setHasOpenedCapCut(true);
  }, [isMobile, isIOS]);

  // Step 2: Import edited video back
  const handleImportFromCapCut = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid video file');
      return;
    }

    // Check file size (max 500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Video file is too large. Maximum 500MB allowed.');
      return;
    }

    setIsImporting(true);
    
    try {
      const url = URL.createObjectURL(file);
      setImportedVideoUrl(url);
      setShowDestinationPicker(true);
      setHasOpenedCapCut(false);
      toast.success('Video imported! Choose where to share.');
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import video');
    } finally {
      setIsImporting(false);
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    }
  }, []);

  const handleImportClick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleSelectDestination = useCallback((destination: 'reel' | 'story' | 'post') => {
    if (importedVideoUrl) {
      onImportVideo(importedVideoUrl, destination);
      setShowDestinationPicker(false);
      setImportedVideoUrl(null);
      
      const labels = { reel: 'Reel', story: 'Story', post: 'Post' };
      toast.success(`Creating ${labels[destination]}...`);
    }
  }, [importedVideoUrl, onImportVideo]);

  const handleCancelDestination = useCallback(() => {
    if (importedVideoUrl) {
      URL.revokeObjectURL(importedVideoUrl);
    }
    setShowDestinationPicker(false);
    setImportedVideoUrl(null);
  }, [importedVideoUrl]);

  // Destination Picker View
  if (showDestinationPicker) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-cyan-500" />
          <h3 className="font-semibold">Share To</h3>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Choose where to publish your video
        </p>

        {/* Video Preview */}
        {importedVideoUrl && (
          <div className="rounded-lg overflow-hidden bg-black aspect-[9/16] max-h-48">
            <video 
              src={importedVideoUrl} 
              className="w-full h-full object-contain"
              muted
              playsInline
            />
          </div>
        )}

        {/* Destination Options */}
        <div className="grid gap-3">
          <Button
            onClick={() => handleSelectDestination('reel')}
            variant="outline"
            className="h-auto py-4 flex items-center gap-4 justify-start border-cyan-500/30 hover:border-cyan-500 hover:bg-cyan-500/10"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Film className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="font-semibold">SV Reel</div>
              <div className="text-xs text-muted-foreground">Short-form vertical video</div>
            </div>
          </Button>

          <Button
            onClick={() => handleSelectDestination('story')}
            variant="outline"
            className="h-auto py-4 flex items-center gap-4 justify-start border-cyan-500/30 hover:border-cyan-500 hover:bg-cyan-500/10"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="font-semibold">SV Story</div>
              <div className="text-xs text-muted-foreground">24-hour disappearing content</div>
            </div>
          </Button>

          <Button
            onClick={() => handleSelectDestination('post')}
            variant="outline"
            className="h-auto py-4 flex items-center gap-4 justify-start border-cyan-500/30 hover:border-cyan-500 hover:bg-cyan-500/10"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <FileImage className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="font-semibold">SV Post</div>
              <div className="text-xs text-muted-foreground">Feed post with video</div>
            </div>
          </Button>
        </div>

        <Button
          onClick={handleCancelDestination}
          variant="ghost"
          className="w-full"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Wand2 className="w-5 h-5 text-cyan-500" />
        <h3 className="font-semibold">CapCut Editor</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Create professional videos in CapCut, then import them here to share.
      </p>

      {/* Step 1: Open CapCut */}
      <Card className={`p-4 transition-all ${!hasOpenedCapCut ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-muted'}`}>
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
            !hasOpenedCapCut ? 'bg-cyan-500 text-white' : 'bg-muted text-muted-foreground'
          }`}>
            1
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium">Open CapCut</h4>
            <p className="text-sm text-muted-foreground mb-3">
              {isMobile 
                ? 'Open CapCut app and create your video from scratch or your gallery' 
                : 'Open CapCut web editor and create your video'}
            </p>
            <Button
              onClick={handleOpenCapCut}
              variant={hasOpenedCapCut ? 'outline' : 'default'}
              className="w-full gap-2"
            >
              {isMobile ? (
                <>
                  <Smartphone className="w-4 h-4" />
                  {isIOS ? 'Open CapCut (App Store)' : 'Open CapCut (Play Store)'}
                </>
              ) : (
                <>
                  <Monitor className="w-4 h-4" />
                  Open CapCut Web Editor
                </>
              )}
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex justify-center">
        <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
      </div>

      {/* Step 2: Import */}
      <Card className={`p-4 transition-all ${hasOpenedCapCut ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-2 border-dashed border-muted-foreground/30'}`}>
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
            hasOpenedCapCut ? 'bg-cyan-500 text-white' : 'bg-muted text-muted-foreground'
          }`}>
            2
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium">Import Your Video</h4>
            <p className="text-sm text-muted-foreground mb-3">
              After editing in CapCut, export and upload here
            </p>
            <Button
              onClick={handleImportClick}
              disabled={isImporting}
              variant={hasOpenedCapCut ? 'default' : 'outline'}
              className="w-full gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import from CapCut
                </>
              )}
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept="video/mp4,video/mov,video/quicktime,video/webm,video/*"
              className="hidden"
              onChange={handleImportFromCapCut}
            />
          </div>
        </div>
      </Card>

      {/* Tips */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h4 className="font-medium text-sm">💡 Pro Tips</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Use CapCut's AI features for auto-captions</li>
          <li>• Add trending sounds and effects</li>
          <li>• Apply professional transitions</li>
          <li>• Use templates for quick edits</li>
          <li>• Export in highest quality for best results</li>
        </ul>
      </div>
    </div>
  );
}
