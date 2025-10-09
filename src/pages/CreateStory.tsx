import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Camera, X } from "lucide-react";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";

const CreateStory = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = file.type.startsWith('video') ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large. Max ${file.type.startsWith('video') ? '50' : '15'}MB`);
      return;
    }

    setSelectedMedia(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
      toast.success("High-quality media loaded!");
    };
    reader.readAsDataURL(file);
  };

  const handleCreateStory = async () => {
    if (!previewUrl) {
      toast.error("Please select media for your story");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { error } = await supabase
      .from("stories")
      .insert({
        user_id: user.id,
        media_url: previewUrl,
        media_type: selectedMedia?.type.startsWith('video') ? 'video' : 'image',
      });

    if (error) {
      toast.error("Failed to create story");
    } else {
      toast.success("Story added successfully!");
      navigate("/home");
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
          <h1 className="text-xl font-bold">Add Story</h1>
          <div className="w-10" />
        </div>

        <div className="glass rounded-2xl p-8 space-y-6 text-center">
          {previewUrl ? (
            <div className="relative">
              <img src={previewUrl} alt="Story preview" className="w-full h-96 object-cover rounded-2xl" />
              <button
                onClick={() => {
                  setPreviewUrl("");
                  setSelectedMedia(null);
                }}
                className="absolute top-4 right-4 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          ) : (
            <>
              <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-xl shadow-orange-500/50">
                <Camera className="w-16 h-16 text-white" />
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-2">Create Your Story</h2>
                <p className="text-muted-foreground">
                  Share a moment that disappears after 24 hours
                </p>
              </div>
            </>
          )}

          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaSelect}
              className="hidden"
            />
            
            <Button
              onClick={() => toast.info("Camera feature coming soon!")}
              className="w-full glass-hover h-14"
              variant="outline"
            >
              <Camera className="w-5 h-5 mr-2" />
              Take Photo
            </Button>

            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full glass-hover h-14"
              variant="outline"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload from Gallery
            </Button>

            <Button
              onClick={handleCreateStory}
              disabled={loading || !previewUrl}
              className="w-full glow-primary h-14"
            >
              {loading ? "Creating..." : "Share Story"}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            📸 Images: 15MB max • 🎥 Videos: 50MB max • High quality preserved
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateStory;
