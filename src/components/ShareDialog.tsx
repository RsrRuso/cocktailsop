import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Share2, Copy, MessageCircle, Instagram, Download, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import UserSelectionDialog from "./UserSelectionDialog";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postContent: string;
  postType?: 'post' | 'reel';
  mediaUrls?: string[];
}

const ShareDialog = ({ open, onOpenChange, postId, postContent, postType = 'post', mediaUrls = [] }: ShareDialogProps) => {
  const [copied, setCopied] = useState(false);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const shareUrl = `${window.location.origin}/post/${postId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate Instagram Story image (9:16 ratio - 1080x1920)
  const generateStoryImage = async (): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d')!;

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f0f23');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    // Add decorative circles
    ctx.fillStyle = 'rgba(139, 92, 246, 0.1)';
    ctx.beginPath();
    ctx.arc(900, 200, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(180, 1700, 250, 0, Math.PI * 2);
    ctx.fill();

    // Load and draw media if available
    if (mediaUrls.length > 0) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = mediaUrls[0];
        });

        // Calculate dimensions to fit in center with padding
        const maxWidth = 980;
        const maxHeight = 980;
        let drawWidth = img.width;
        let drawHeight = img.height;

        if (drawWidth > maxWidth) {
          drawHeight = (maxWidth / drawWidth) * drawHeight;
          drawWidth = maxWidth;
        }
        if (drawHeight > maxHeight) {
          drawWidth = (maxHeight / drawHeight) * drawWidth;
          drawHeight = maxHeight;
        }

        const x = (1080 - drawWidth) / 2;
        const y = 400;

        // Draw rounded rectangle clip
        ctx.save();
        ctx.beginPath();
        const radius = 24;
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + drawWidth - radius, y);
        ctx.quadraticCurveTo(x + drawWidth, y, x + drawWidth, y + radius);
        ctx.lineTo(x + drawWidth, y + drawHeight - radius);
        ctx.quadraticCurveTo(x + drawWidth, y + drawHeight, x + drawWidth - radius, y + drawHeight);
        ctx.lineTo(x + radius, y + drawHeight);
        ctx.quadraticCurveTo(x, y + drawHeight, x, y + drawHeight - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, x, y, drawWidth, drawHeight);
        ctx.restore();
      } catch (err) {
        console.log('Could not load image:', err);
      }
    }

    // Add SpecVerse branding at top
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 48px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('SpecVerse', 540, 120);

    // Add "Swipe up" indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '32px system-ui, sans-serif';
    ctx.fillText('Swipe up to view', 540, 1750);

    // Draw arrow up
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(540, 1780);
    ctx.lineTo(540, 1830);
    ctx.moveTo(520, 1800);
    ctx.lineTo(540, 1780);
    ctx.lineTo(560, 1800);
    ctx.stroke();

    // Add post content (truncated)
    if (postContent) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '36px system-ui, sans-serif';
      ctx.textAlign = 'center';
      const maxChars = 100;
      const displayText = postContent.length > maxChars 
        ? postContent.slice(0, maxChars) + '...' 
        : postContent;
      
      // Word wrap
      const words = displayText.split(' ');
      let line = '';
      let lineY = mediaUrls.length > 0 ? 1500 : 900;
      const maxLineWidth = 900;
      
      for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxLineWidth && line !== '') {
          ctx.fillText(line.trim(), 540, lineY);
          line = word + ' ';
          lineY += 50;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), 540, lineY);
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
    });
  };

  const handleShareToInstagramStory = async () => {
    setIsGeneratingStory(true);
    
    try {
      const storyBlob = await generateStoryImage();
      const storyFile = new File([storyBlob], 'specverse-story.png', { type: 'image/png' });

      // Check if Web Share API supports files (mainly mobile)
      if (navigator.canShare && navigator.canShare({ files: [storyFile] })) {
        try {
          await navigator.share({
            files: [storyFile],
            title: 'Share to Instagram Story',
            text: postContent.slice(0, 100),
          });
          toast.success('Opening share menu - select Instagram Stories!');
          return;
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.log('Share failed, falling back to download');
          } else {
            return; // User cancelled
          }
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
      
      toast.success('Story image downloaded! Open Instagram and add it to your story.', {
        duration: 5000,
      });
    } catch (err) {
      console.error('Error generating story:', err);
      toast.error('Failed to generate story image');
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const handleShareExternal = async (platform: string) => {
    const text = postContent.slice(0, 100) + (postContent.length > 100 ? '...' : '');
    
    // Try native share first on mobile
    if (navigator.share && platform === 'native') {
      try {
        await navigator.share({
          title: 'Check out this post',
          text: text,
          url: shareUrl,
        });
        toast.success('Shared successfully!');
        return;
      } catch (err) {
        // User cancelled or error occurred
        return;
      }
    }

    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(shareUrl);
    
    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    };

    if (shareUrls[platform]) {
      const width = 600;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        shareUrls[platform], 
        '_blank', 
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
      );
      
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Popup blocked, fallback to direct link
        window.location.href = shareUrls[platform];
      } else {
        toast.success(`Opening ${platform}...`);
      }
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed inset-0 sm:inset-x-4 sm:top-[5%] sm:bottom-[5%] z-50 mx-auto sm:max-w-md flex flex-col overflow-hidden">
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-2 top-2 z-10 p-2 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="p-6 pb-4 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="relative p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <DialogPrimitive.Title className="text-xl font-semibold text-white">
                Share Post
              </DialogPrimitive.Title>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
            {/* Send via DM Section */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-white/80">Share in Direct Message</label>
              <Button
                onClick={() => setShowUserSelection(true)}
                className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                <Send className="w-5 h-5 mr-2" />
                Send via Direct Message
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-transparent px-2 text-white/60">Or share externally</span>
              </div>
            </div>

            {/* External Share Section */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-white/80">Share Externally</label>
              
              {/* Copy Link */}
              <div className="flex gap-2">
                <Input 
                  value={shareUrl} 
                  readOnly 
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40" 
                />
                <Button 
                  onClick={handleCopyLink} 
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>

              {/* Instagram Story - Featured */}
              <Button
                onClick={handleShareToInstagramStory}
                disabled={isGeneratingStory}
                className="w-full h-14 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white font-medium"
              >
                {isGeneratingStory ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating Story...
                  </>
                ) : (
                  <>
                    <Instagram className="w-5 h-5 mr-2" />
                    Share to Instagram Story
                  </>
                )}
              </Button>

              {/* Social Media */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleShareExternal("whatsapp")}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
                <Button
                  onClick={() => handleShareExternal("telegram")}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Telegram
                </Button>
                <Button
                  onClick={() => handleShareExternal("twitter")}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  𝕏
                  <span className="ml-2">Twitter</span>
                </Button>
                <Button
                  onClick={() => handleShareExternal("facebook")}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  f
                  <span className="ml-2">Facebook</span>
                </Button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>

      <UserSelectionDialog
        open={showUserSelection}
        onOpenChange={setShowUserSelection}
        postContent={postContent}
        postId={postId}
        postType={postType}
        mediaUrls={mediaUrls}
      />
    </DialogPrimitive.Root>
  );
};

export default ShareDialog;