import { useState, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { X, ImageIcon, Film, CircleDot, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { toPng } from "html-to-image";
import { supabase } from "@/integrations/supabase/client";

interface ShareAnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentRef: React.RefObject<HTMLDivElement>;
  title: string;
}

export const ShareAnalyticsDialog = ({ 
  open, 
  onOpenChange, 
  contentRef, 
  title 
}: ShareAnalyticsDialogProps) => {
  const navigate = useNavigate();
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const captureContent = async () => {
    if (!contentRef.current) {
      toast.error("Unable to capture content");
      return null;
    }

    setIsCapturing(true);
    try {
      const dataUrl = await toPng(contentRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#1a1a1a',
      });
      setCapturedImage(dataUrl);
      return dataUrl;
    } catch (error) {
      console.error("Error capturing content:", error);
      toast.error("Failed to capture content");
      return null;
    } finally {
      setIsCapturing(false);
    }
  };

  const uploadToStorage = async (dataUrl: string): Promise<string | null> => {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const fileName = `analytics-${Date.now()}.png`;
      
      const { data, error } = await supabase.storage
        .from('media')
        .upload(`shared-analytics/${fileName}`, blob, {
          contentType: 'image/png',
          upsert: true
        });

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from('media')
        .getPublicUrl(`shared-analytics/${fileName}`);

      return publicUrl.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  };

  const handleShareToStory = async () => {
    const image = capturedImage || await captureContent();
    if (!image) return;

    const uploadedUrl = await uploadToStorage(image);
    if (uploadedUrl) {
      onOpenChange(false);
      navigate('/create-story', { 
        state: { 
          preloadedMedia: { url: uploadedUrl, type: 'image' },
          caption: `📊 ${title}`
        } 
      });
      toast.success("Opening Story editor...");
    } else {
      toast.error("Failed to prepare image for sharing");
    }
  };

  const handleShareToPost = async () => {
    const image = capturedImage || await captureContent();
    if (!image) return;

    const uploadedUrl = await uploadToStorage(image);
    if (uploadedUrl) {
      onOpenChange(false);
      navigate('/create-post', { 
        state: { 
          preloadedMedia: [uploadedUrl],
          caption: `📊 ${title}`
        } 
      });
      toast.success("Opening Post editor...");
    } else {
      toast.error("Failed to prepare image for sharing");
    }
  };

  const handleShareToReel = async () => {
    const image = capturedImage || await captureContent();
    if (!image) return;

    const uploadedUrl = await uploadToStorage(image);
    if (uploadedUrl) {
      onOpenChange(false);
      navigate('/create-reel', { 
        state: { 
          preloadedImage: uploadedUrl,
          caption: `📊 ${title}`
        } 
      });
      toast.success("Opening Reel editor...");
    } else {
      toast.error("Failed to prepare image for sharing");
    }
  };

  const handleClose = () => {
    setCapturedImage(null);
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]" />
        <DialogPrimitive.Content 
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md bg-card border border-border rounded-2xl z-[101] overflow-hidden"
          aria-describedby={undefined}
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Share {title}</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Share {title}</h3>
            </div>
            <button 
              onClick={handleClose}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Preview */}
            {capturedImage && (
              <div className="rounded-lg overflow-hidden border border-border">
                <img 
                  src={capturedImage} 
                  alt="Preview" 
                  className="w-full h-auto max-h-48 object-contain bg-muted/50"
                />
              </div>
            )}

            {/* Capture Button */}
            {!capturedImage && (
              <Button
                onClick={captureContent}
                disabled={isCapturing}
                variant="outline"
                className="w-full"
              >
                {isCapturing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Capturing...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Capture Preview
                  </>
                )}
              </Button>
            )}

            {/* Share Options */}
            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={handleShareToStory}
                disabled={isCapturing}
                className="flex flex-col items-center gap-2 h-auto py-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30"
                variant="outline"
              >
                <CircleDot className="w-6 h-6 text-purple-400" />
                <span className="text-xs font-medium">Story</span>
              </Button>
              
              <Button
                onClick={handleShareToPost}
                disabled={isCapturing}
                className="flex flex-col items-center gap-2 h-auto py-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 border border-blue-500/30"
                variant="outline"
              >
                <ImageIcon className="w-6 h-6 text-blue-400" />
                <span className="text-xs font-medium">Post</span>
              </Button>
              
              <Button
                onClick={handleShareToReel}
                disabled={isCapturing}
                className="flex flex-col items-center gap-2 h-auto py-4 bg-gradient-to-br from-rose-500/20 to-orange-500/20 hover:from-rose-500/30 hover:to-orange-500/30 border border-rose-500/30"
                variant="outline"
              >
                <Film className="w-6 h-6 text-rose-400" />
                <span className="text-xs font-medium">Reel</span>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Share your achievements with your network
            </p>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
