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

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postContent: string;
}

const ShareDialog = ({ open, onOpenChange, postId, postContent }: ShareDialogProps) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/post/${postId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareExternal = (platform: string) => {
    const text = encodeURIComponent(postContent);
    const url = encodeURIComponent(shareUrl);
    
    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${text}`,
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
      toast.success(`Sharing to ${platform}!`);
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

        <div className="space-y-4">
          {/* Copy Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Post Link</label>
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="flex-1" />
              <Button onClick={handleCopyLink} variant="outline">
                <Copy className="w-4 h-4" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          {/* Share to Social Media */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Share to</label>
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

          {/* Send via DM */}
          <Button
            onClick={() => {
              onOpenChange(false);
              toast.info("Opening messages...");
              // Navigate to messages would be handled in parent
            }}
            className="w-full glow-primary"
          >
            <Send className="w-4 h-4 mr-2" />
            Send via Direct Message
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
