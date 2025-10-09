import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Camera, Video, Image } from "lucide-react";
import { Button } from "@/components/ui/button";

const Create = () => {
  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6">
        <h2 className="text-2xl font-bold">Create Content</h2>

        <div className="space-y-4">
          <button className="w-full glass-hover rounded-2xl p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl glass flex items-center justify-center glow-primary">
              <Camera className="w-7 h-7 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Create Post</h3>
              <p className="text-sm text-muted-foreground">Share a photo or update</p>
            </div>
          </button>

          <button className="w-full glass-hover rounded-2xl p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl glass flex items-center justify-center glow-accent">
              <Video className="w-7 h-7 text-accent" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Create Reel</h3>
              <p className="text-sm text-muted-foreground">Record or upload a video</p>
            </div>
          </button>

          <button className="w-full glass-hover rounded-2xl p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl glass flex items-center justify-center">
              <Image className="w-7 h-7 text-secondary" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Add Story</h3>
              <p className="text-sm text-muted-foreground">Share a moment (24h)</p>
            </div>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Create;
