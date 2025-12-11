import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Instagram, Download, Loader2, Share2, Copy, Link } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import QRCode from "qrcode";

interface ShareSpecVerseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ShareSpecVerseDialog = ({ open, onOpenChange }: ShareSpecVerseDialogProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const appUrl = window.location.origin;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate Instagram Story image promoting SpecVerse (9:16 ratio - 1080x1920)
  const generateStoryImage = async (): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d')!;

    // Create stunning gradient background
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
    gradient.addColorStop(0, '#0f0f23');
    gradient.addColorStop(0.3, '#1a1a2e');
    gradient.addColorStop(0.6, '#16213e');
    gradient.addColorStop(1, '#0f0f23');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    // Add animated-looking decorative elements
    // Purple glow top right
    const purpleGlow = ctx.createRadialGradient(900, 300, 0, 900, 300, 400);
    purpleGlow.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
    purpleGlow.addColorStop(0.5, 'rgba(139, 92, 246, 0.1)');
    purpleGlow.addColorStop(1, 'rgba(139, 92, 246, 0)');
    ctx.fillStyle = purpleGlow;
    ctx.fillRect(0, 0, 1080, 700);

    // Pink glow bottom left
    const pinkGlow = ctx.createRadialGradient(180, 1600, 0, 180, 1600, 350);
    pinkGlow.addColorStop(0, 'rgba(236, 72, 153, 0.3)');
    pinkGlow.addColorStop(0.5, 'rgba(236, 72, 153, 0.1)');
    pinkGlow.addColorStop(1, 'rgba(236, 72, 153, 0)');
    ctx.fillStyle = pinkGlow;
    ctx.fillRect(0, 1200, 600, 720);

    // Blue accent center
    const blueGlow = ctx.createRadialGradient(540, 960, 0, 540, 960, 500);
    blueGlow.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
    blueGlow.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = blueGlow;
    ctx.fillRect(0, 400, 1080, 1200);

    // Draw floating circles/orbs
    const drawOrb = (x: number, y: number, size: number, color: string) => {
      const orbGrad = ctx.createRadialGradient(x, y, 0, x, y, size);
      orbGrad.addColorStop(0, color);
      orbGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    };

    drawOrb(200, 500, 80, 'rgba(139, 92, 246, 0.3)');
    drawOrb(880, 700, 60, 'rgba(236, 72, 153, 0.25)');
    drawOrb(150, 1100, 50, 'rgba(59, 130, 246, 0.2)');
    drawOrb(950, 1300, 70, 'rgba(139, 92, 246, 0.2)');

    // Main title "SpecVerse" with elegant script font style
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 120px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Add subtle shadow
    ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillText('SpecVerse', 540, 700);
    ctx.restore();

    // Tagline
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '400 42px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('The Future of Hospitality', 540, 820);

    // Features list with icons (using text symbols)
    const features = [
      '🍸 Professional Cocktail SOPs',
      '📊 Advanced Analytics',
      '👥 Team Collaboration',
      '🎵 Music & Content Sharing',
      '🤖 AI-Powered Insights',
    ];

    ctx.font = '36px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.textAlign = 'center';
    
    features.forEach((feature, i) => {
      ctx.fillText(feature, 540, 1000 + (i * 70));
    });

    // Generate QR code
    try {
      const qrDataUrl = await QRCode.toDataURL(appUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#ffffff',
          light: 'transparent'
        }
      });
      
      const qrImg = new Image();
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = reject;
        qrImg.src = qrDataUrl;
      });
      
      // Draw QR code with background
      const qrSize = 180;
      const qrX = (1080 - qrSize) / 2;
      const qrY = 1480;
      
      // QR background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 20);
      ctx.fill();
      
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      
      // Scan to visit text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Scan to Visit', 540, qrY + qrSize + 50);
    } catch (err) {
      console.log('QR generation failed:', err);
    }

    // App URL at bottom
    ctx.font = '28px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.textAlign = 'center';
    ctx.fillText(appUrl.replace('https://', ''), 540, 1850);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
    });
  };

  const handleShareToInstagram = async () => {
    setIsGenerating(true);
    
    try {
      const storyBlob = await generateStoryImage();
      const storyFile = new File([storyBlob], 'specverse-promo.png', { type: 'image/png' });

      // Check if Web Share API supports files (mobile)
      if (navigator.canShare && navigator.canShare({ files: [storyFile] })) {
        try {
          await navigator.share({
            files: [storyFile],
            title: 'SpecVerse - The Future of Hospitality',
            text: `Check out SpecVerse! ${appUrl}`,
          });
          toast.success('Opening share menu - select Instagram Stories!');
          onOpenChange(false);
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }

      // Fallback: Download the image
      const url = URL.createObjectURL(storyBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'specverse-story.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Story image downloaded! Upload it to Instagram Stories.', {
        duration: 5000,
      });
    } catch (err) {
      console.error('Error generating story:', err);
      toast.error('Failed to generate story image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNativeShare = async () => {
    setIsGenerating(true);
    
    try {
      // Generate the story image
      const storyBlob = await generateStoryImage();
      const storyFile = new File([storyBlob], 'specverse-story.png', { type: 'image/png' });

      // Try native share with image + clickable link in text
      if (navigator.canShare && navigator.canShare({ files: [storyFile] })) {
        try {
          await navigator.share({
            files: [storyFile],
            title: 'SpecVerse',
            text: `Check out SpecVerse - The Future of Hospitality! 🍸\n\n👉 ${appUrl}`,
          });
          toast.success('Shared successfully!');
          onOpenChange(false);
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            return; // User cancelled
          }
        }
      }

      // Fallback: Try share without file but with clickable link
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'SpecVerse',
            text: `Check out SpecVerse - The Future of Hospitality! 🍸\n\n👉 ${appUrl}`,
          });
          toast.success('Shared successfully!');
          onOpenChange(false);
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            return;
          }
        }
      }

      // Final fallback: Download image and copy link
      const url = URL.createObjectURL(storyBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'specverse-story.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      navigator.clipboard.writeText(appUrl);
      toast.success('Image downloaded & link copied! Share them together.');
    } catch (err) {
      console.error('Share failed:', err);
      toast.error('Failed to share');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share SpecVerse
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share SpecVerse with your network and help grow the hospitality community!
          </p>

          {/* Instagram Story - Featured */}
          <Button
            onClick={handleShareToInstagram}
            disabled={isGenerating}
            className="w-full h-14 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white font-medium"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating Story...
              </>
            ) : (
              <>
                <Instagram className="w-5 h-5 mr-2" />
                Share to Instagram Story
              </>
            )}
          </Button>

          {/* Native Share */}
          <Button
            onClick={handleNativeShare}
            variant="outline"
            className="w-full h-12"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Link
          </Button>

          {/* Copy Link */}
          <div className="flex gap-2">
            <Input value={appUrl} readOnly className="flex-1 text-sm" />
            <Button onClick={handleCopyLink} variant="outline" size="icon">
              {copied ? <Link className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            The story image is optimized for Instagram Stories (9:16 ratio)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareSpecVerseDialog;
