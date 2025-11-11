import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Video, FileText, Film } from "lucide-react";

const Create = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6">
        <h2 className="text-2xl font-bold">Create Content</h2>
        <p className="text-muted-foreground">Choose what you want to share</p>

        <div className="space-y-4">
          <button 
            onClick={() => navigate("/create/post")}
            className="w-full glass-hover rounded-2xl p-8 flex items-center gap-4 group hover:scale-[1.02] transition-all"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-xl shadow-blue-500/50 group-hover:shadow-blue-500/70 transition-all">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-bold text-lg">Create Post</h3>
              <p className="text-sm text-muted-foreground">Share your thoughts, photos, and updates</p>
            </div>
          </button>

          <button 
            onClick={() => navigate("/create/reel")}
            className="w-full glass-hover rounded-2xl p-8 flex items-center gap-4 group hover:scale-[1.02] transition-all"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center shadow-xl shadow-purple-500/50 group-hover:shadow-purple-500/70 transition-all">
              <Video className="w-8 h-8 text-white" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-bold text-lg">Create Reel</h3>
              <p className="text-sm text-muted-foreground">Share short engaging video content</p>
            </div>
          </button>

          <button 
            onClick={() => navigate("/reel-editor")}
            className="w-full glass-hover rounded-2xl p-8 flex items-center gap-4 group hover:scale-[1.02] transition-all"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 flex items-center justify-center shadow-xl shadow-orange-500/50 group-hover:shadow-orange-500/70 transition-all">
              <Film className="w-8 h-8 text-white" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-bold text-lg">Advanced Reel Editor</h3>
              <p className="text-sm text-muted-foreground">Professional video editing with filters, effects, and more</p>
            </div>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Create;
