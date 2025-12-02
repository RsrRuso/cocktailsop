import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Download, Upload, ExternalLink, Smartphone, Monitor, ArrowRight, Check, Loader2, RefreshCw } from 'lucide-react';

interface CapCutToolProps {
  videoUrl: string | null;
  onImportVideo: (url: string) => void;
}

export function CapCutTool({ videoUrl, onImportVideo }: CapCutToolProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportedForCapCut, setExportedForCapCut] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleExportToCapCut = useCallback(async () => {
    if (!videoUrl) {
      toast.error('No video to export');
      return;
    }

    setIsExporting(true);
    try {
      // Handle both blob URLs and regular URLs
      let blob: Blob;
      
      if (videoUrl.startsWith('blob:')) {
        const response = await fetch(videoUrl);
        if (!response.ok) throw new Error('Failed to fetch video');
        blob = await response.blob();
      } else {
        const response = await fetch(videoUrl, { mode: 'cors' });
        if (!response.ok) throw new Error('Failed to fetch video');
        blob = await response.blob();
      }
      
      // Ensure proper video MIME type
      const videoBlob = new Blob([blob], { type: 'video/mp4' });
      
      // Create download link
      const downloadUrl = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `sv-video-${Date.now()}.mp4`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
      }, 100);
      
      setExportedForCapCut(true);
      toast.success('Video downloaded! Open it in CapCut to edit');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export video. Try again.');
    } finally {
      setIsExporting(false);
    }
  }, [videoUrl]);

  const handleOpenCapCut = useCallback(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // CapCut deep link
      window.location.href = 'capcut://';
      
      // Fallback to app store after delay
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
      setExportedForCapCut(false);
      toast.success('Video imported successfully!');
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import video');
    } finally {
      setIsImporting(false);
      // Reset input for re-selection
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    }
  }, [onImportVideo]);

  const handleImportClick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <img 
            src="https://sf16-website-login.neutral.ttwstatic.com/obj/tiktok_web_login_static/capcut/website/favicon.ico" 
            alt="CapCut" 
            className="w-5 h-5"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          CapCut Collaboration
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Export your video to CapCut for professional editing, then import the result back
        </p>
      </div>

      {/* Workflow Steps */}
      <div className="space-y-3">
        <Card className={`p-4 transition-all ${!exportedForCapCut ? 'border-primary bg-primary/5' : 'opacity-60'}`}>
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${!exportedForCapCut ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {exportedForCapCut ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium">Export Video</h4>
              <p className="text-sm text-muted-foreground mb-3">Download your video to edit in CapCut</p>
              <Button
                onClick={handleExportToCapCut}
                disabled={isExporting || !videoUrl}
                variant={exportedForCapCut ? 'outline' : 'default'}
                className="w-full gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    {exportedForCapCut ? 'Download Again' : 'Export for CapCut'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex justify-center">
          <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
        </div>

        <Card className={`p-4 transition-all ${exportedForCapCut ? 'border-primary bg-primary/5' : 'opacity-60'}`}>
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${exportedForCapCut ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              2
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium">Edit in CapCut</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Open CapCut and import your downloaded video
              </p>
              <Button
                onClick={handleOpenCapCut}
                variant="outline"
                className="w-full gap-2"
              >
                {isMobile ? (
                  <>
                    <Smartphone className="w-4 h-4" />
                    Open CapCut App
                  </>
                ) : (
                  <>
                    <Monitor className="w-4 h-4" />
                    Open CapCut Web
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

        <Card className="p-4 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
              3
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium">Import Edited Video</h4>
              <p className="text-sm text-muted-foreground mb-3">
                After editing in CapCut, export and import here
              </p>
              <Button
                onClick={handleImportClick}
                disabled={isImporting}
                variant="outline"
                className="w-full gap-2"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
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
      </div>

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