import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Wand2, Download, Loader2 } from "lucide-react";

interface AvatarGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAvatarGenerated?: (imageUrl: string) => void;
}

const AvatarGeneratorDialog = ({ open, onOpenChange, onAvatarGenerated }: AvatarGeneratorDialogProps) => {
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateAvatar = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please describe the avatar you want to generate",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: `Generate a futuristic profile avatar: ${prompt}. Make it professional, high quality, and centered on a clean background.`,
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (imageUrl) {
        setGeneratedImage(imageUrl);
        toast({
          title: "Avatar generated!",
          description: "Your futuristic avatar is ready",
        });
      } else {
        throw new Error("No image generated");
      }
    } catch (error: any) {
      console.error("Error generating avatar:", error);
      toast({
        title: "Generation failed",
        description: error?.message || "Failed to generate avatar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (generatedImage) {
      const link = document.createElement("a");
      link.href = generatedImage;
      link.download = "futuristic-avatar.png";
      link.click();
    }
  };

  const useAvatar = () => {
    if (generatedImage && onAvatarGenerated) {
      onAvatarGenerated(generatedImage);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-background/95 backdrop-blur-sm border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            AI Avatar Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="prompt" className="text-sm font-medium">
              Describe your avatar
            </Label>
            <Input
              id="prompt"
              placeholder="e.g., cyberpunk style portrait, neon colors, digital art"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-2 bg-background/50 backdrop-blur-sm"
              disabled={loading}
            />
          </div>

          {generatedImage && (
            <div className="relative aspect-square rounded-lg overflow-hidden border border-primary/20">
              <img
                src={generatedImage}
                alt="Generated avatar"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={generateAvatar}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>

            {generatedImage && (
              <>
                <Button
                  variant="outline"
                  onClick={downloadImage}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="default"
                  onClick={useAvatar}
                  className="flex-1"
                >
                  Use Avatar
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarGeneratorDialog;
