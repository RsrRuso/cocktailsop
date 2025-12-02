import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, ExternalLink, Smartphone, Monitor, ArrowRight, Loader2, Wand2 } from 'lucide-react';

interface CapCutToolProps {
  videoUrl: string | null;
  onImportVideo: (url: string) => void;
}

export function CapCutTool({ videoUrl, onImportVideo }: CapCutToolProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [hasOpenedCapCut, setHasOpenedCapCut] = useState(false);
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
      onImportVideo(url);
      setHasOpenedCapCut(false);
      toast.success('Video imported successfully!');
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import video');
    } finally {
      setIsImporting(false);
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    }
  }, [onImportVideo]);

  const handleImportClick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

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
