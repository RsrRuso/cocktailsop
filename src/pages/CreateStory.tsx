import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Camera } from "lucide-react";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";

const CreateStory = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleCreateStory = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // For demo purposes, create a story with placeholder data
    const { error } = await supabase
      .from("stories")
      .insert({
        user_id: user.id,
        media_url: "https://via.placeholder.com/400x700",
        media_type: "image",
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
          <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-pink-600 to-orange-500 flex items-center justify-center">
            <Camera className="w-16 h-16 text-white" />
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-2">Create Your Story</h2>
            <p className="text-muted-foreground">
              Share a moment that disappears after 24 hours
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => toast.info("Camera feature coming soon!")}
              className="w-full glass-hover h-14"
              variant="outline"
            >
              <Camera className="w-5 h-5 mr-2" />
              Take Photo
            </Button>

            <Button
              onClick={() => toast.info("Upload feature coming soon!")}
              className="w-full glass-hover h-14"
              variant="outline"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload from Gallery
            </Button>

            <Button
              onClick={handleCreateStory}
              disabled={loading}
              className="w-full glow-primary h-14"
            >
              {loading ? "Creating..." : "Create Demo Story"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateStory;
