import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Download, Upload, ExternalLink, Smartphone, Monitor, ArrowRight, Check, Loader2 } from 'lucide-react';

interface CapCutToolProps {
  videoUrl: string | null;
  onImportVideo: (url: string) => void;
}

export function CapCutTool({ videoUrl, onImportVideo }: CapCutToolProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportedForCapCut, setExportedForCapCut] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleExportToCapCut = async () => {
    if (!videoUrl) {
      toast.error('No video to export');
      return;
    }

    setIsExporting(true);
    try {
      // Fetch the video blob
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `sv-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      
      setExportedForCapCut(true);
      toast.success('Video downloaded! Open it in CapCut to edit');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export video');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenCapCut = () => {
    // Try to open CapCut app via deep link (works on mobile)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // CapCut deep link schemes
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
      // Desktop - open CapCut web
      window.open('https://www.capcut.com/editor', '_blank');
    }
  };

  const handleImportFromCapCut = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      onImportVideo(url);
      setExportedForCapCut(false);
      toast.success('Video imported from CapCut!');
    } else {
      toast.error('Please select a valid video file');
    }
  };

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <img 
            src="https://sf16-website-login.neutral.ttwstatic.com/obj/tiktok_web_login_static/capcut/website/favicon.ico" 
            alt="CapCut" 
            className="w-5 h-5"
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
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${!exportedForCapCut ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {exportedForCapCut ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <div className="flex-1">
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
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${exportedForCapCut ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              2
            </div>
            <div className="flex-1">
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

        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div className="flex-1">
              <h4 className="font-medium">Import Edited Video</h4>
              <p className="text-sm text-muted-foreground mb-3">
                After editing in CapCut, export and import here
              </p>
              <Button
                onClick={() => importInputRef.current?.click()}
                variant="outline"
                className="w-full gap-2"
              >
                <Upload className="w-4 h-4" />
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
      </div>

      {/* Tips */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h4 className="font-medium text-sm">💡 Pro Tips</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Use CapCut's AI features for auto-captions</li>
          <li>• Add trending sounds and effects</li>
          <li>• Apply professional transitions</li>
          <li>• Use templates for quick edits</li>
        </ul>
      </div>
    </div>
  );
}
