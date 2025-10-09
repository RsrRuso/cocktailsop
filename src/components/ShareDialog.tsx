import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Share2, Copy, MessageCircle } from "lucide-react";
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
  const shareUrl = `${window.location.origin}/post/${postId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Post
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Send via DM Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-primary">Share in Direct Message</label>
            <Button
              onClick={() => setShowUserSelection(true)}
              className="w-full glow-primary h-12"
            >
              <Send className="w-5 h-5 mr-2" />
              Send via Direct Message
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or share externally</span>
            </div>
          </div>

          {/* External Share Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Share Externally</label>
            
            {/* Copy Link */}
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="flex-1" />
              <Button onClick={handleCopyLink} variant="outline">
                <Copy className="w-4 h-4" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>

            {/* Social Media */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleShareExternal("whatsapp")}
                variant="outline"
                className="glass-hover"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                onClick={() => handleShareExternal("telegram")}
                variant="outline"
                className="glass-hover"
              >
                <Send className="w-4 h-4 mr-2" />
                Telegram
              </Button>
              <Button
                onClick={() => handleShareExternal("twitter")}
                variant="outline"
                className="glass-hover"
              >
                𝕏
                <span className="ml-2">Twitter</span>
              </Button>
              <Button
                onClick={() => handleShareExternal("facebook")}
                variant="outline"
                className="glass-hover"
              >
                f
                <span className="ml-2">Facebook</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      <UserSelectionDialog
        open={showUserSelection}
        onOpenChange={setShowUserSelection}
        postContent={postContent}
        postId={postId}
        postType={postType}
        mediaUrls={mediaUrls}
      />
    </Dialog>
  );
};

export default ShareDialog;
