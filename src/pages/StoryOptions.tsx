import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Camera, Video } from "lucide-react";
import { toast } from "sonner";

const StoryOptions = () => {
  const navigate = useNavigate();

  const handleLiveStream = () => {
    toast.info("Live Stream feature coming soon!");
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6">
        <h2 className="text-2xl font-bold">Your Story</h2>
        <p className="text-muted-foreground">Choose how you want to share</p>

        <div className="space-y-4">
          <button 
            onClick={() => navigate("/create/story")}
            className="w-full glass-hover rounded-2xl p-8 flex items-center gap-4 group hover:scale-[1.02] transition-all"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-xl shadow-orange-500/50 group-hover:shadow-orange-500/70 transition-all">
              <Camera className="w-8 h-8 text-white" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-bold text-lg">Create Story</h3>
              <p className="text-sm text-muted-foreground">Share photos and videos that disappear in 24 hours</p>
            </div>
          </button>

          <button 
            onClick={handleLiveStream}
            className="w-full glass-hover rounded-2xl p-8 flex items-center gap-4 group hover:scale-[1.02] transition-all"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 via-pink-500 to-purple-500 flex items-center justify-center shadow-xl shadow-red-500/50 group-hover:shadow-red-500/70 transition-all">
              <Video className="w-8 h-8 text-white" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-bold text-lg">Live Stream</h3>
              <p className="text-sm text-muted-foreground">Go live and connect with your audience in real-time</p>
            </div>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default StoryOptions;
