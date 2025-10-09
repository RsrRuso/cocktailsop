import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Upload, Video } from "lucide-react";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";

const CreateReel = () => {
  const navigate = useNavigate();
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateReel = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // For demo purposes, create a reel with placeholder data
    const { error } = await supabase
      .from("reels")
      .insert({
        user_id: user.id,
        video_url: "https://via.placeholder.com/400x700",
        caption: caption || "New Reel",
        thumbnail_url: "https://via.placeholder.com/400x700",
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
          <div className="aspect-[9/16] rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
            <Video className="w-20 h-20 text-white" strokeWidth={1.5} />
          </div>

          <Textarea
            placeholder="Write a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="glass border-primary/20 min-h-[100px]"
          />

          <div className="space-y-3">
            <Button
              onClick={() => toast.info("Record feature coming soon!")}
              className="w-full glass-hover h-12"
              variant="outline"
            >
              <Video className="w-5 h-5 mr-2" />
              Record Video
            </Button>

            <Button
              onClick={() => toast.info("Upload feature coming soon!")}
              className="w-full glass-hover h-12"
              variant="outline"
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload Video
            </Button>

            <Button
              onClick={handleCreateReel}
              disabled={loading}
              className="w-full glow-primary h-12"
            >
              {loading ? "Creating..." : "Create Demo Reel"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateReel;
