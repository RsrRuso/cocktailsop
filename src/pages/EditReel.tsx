import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";

const EditReel = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [videoUrl, setVideoUrl] = useState("");

  useEffect(() => {
    fetchReel();
  }, [id]);

  const fetchReel = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("reels")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      toast.error("Reel not found or you don't have permission");
      navigate("/thunder");
      return;
    }

    setCaption(data.caption || "");
    setVideoUrl(data.video_url);
    setFetching(false);
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("reels")
      .update({
        caption: caption,
      })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update reel");
    } else {
      toast.success("Reel updated successfully!");
      navigate("/thunder");
    }
    setLoading(false);
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-background pb-20 pt-16">
        <TopNav />
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/thunder")}
            className="glass-hover"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Edit Reel</h1>
          <div className="w-10" />
        </div>

        <div className="glass rounded-2xl p-6 space-y-6">
          <div className="aspect-[9/16] rounded-xl overflow-hidden">
            <video 
              src={videoUrl} 
              controls 
              className="w-full h-full object-cover cursor-pointer"
              onClick={(e) => {
                const video = e.currentTarget;
                if (!document.fullscreenElement) {
                  video.requestFullscreen();
                } else {
                  document.exitFullscreen();
                }
              }}
            />
          </div>

          <Textarea
            placeholder="Write a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="glass border-primary/20 min-h-[100px]"
          />

          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full glow-primary h-12"
          >
            <Save className="w-5 h-5 mr-2" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditReel;
