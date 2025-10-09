import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, Video, X } from "lucide-react";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";

const CreateReel = () => {
  const navigate = useNavigate();
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error("Please select a video file");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video size should be less than 100MB");
      return;
    }

    setSelectedVideo(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
      toast.success("High-quality video loaded!");
    };
    reader.readAsDataURL(file);
  };

  const handleCreateReel = async () => {
    if (!previewUrl) {
      toast.error("Please select a video");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { error } = await supabase
      .from("reels")
      .insert({
        user_id: user.id,
        video_url: previewUrl,
        caption: caption || "Check out my new reel!",
        thumbnail_url: previewUrl,
      });

    if (error) {
      toast.error("Failed to create reel");
    } else {
      toast.success("Reel created successfully!");
      navigate("/thunder");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/create")}
            className="glass-hover"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Create Reel</h1>
          <div className="w-10" />
        </div>

        <div className="glass rounded-2xl p-6 space-y-6">
          {previewUrl ? (
            <div className="relative aspect-[9/16] rounded-2xl overflow-hidden">
              <video src={previewUrl} controls className="w-full h-full object-cover" />
              <button
                onClick={() => {
                  setPreviewUrl("");
                  setSelectedVideo(null);
                }}
                className="absolute top-4 right-4 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center z-10"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          ) : (
            <div className="aspect-[9/16] rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
              <Video className="w-20 h-20 text-white" strokeWidth={1.5} />
            </div>
          )}

          <Textarea
            placeholder="Write a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="glass border-primary/20 min-h-[100px]"
          />

          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoSelect}
              className="hidden"
            />
            
            <Button
              onClick={() => toast.info("Record feature coming soon!")}
              className="w-full glass-hover h-12"
              variant="outline"
            >
              <Video className="w-5 h-5 mr-2" />
              Record Video
            </Button>

            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full glass-hover h-12"
              variant="outline"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload Video
            </Button>

            <Button
              onClick={handleCreateReel}
              disabled={loading || !previewUrl}
              className="w-full glow-primary h-12"
            >
              {loading ? "Creating..." : "Share Reel"}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            🎥 High-quality video supported • Max 100MB
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateReel;
