import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Video, FileText, Film, Wand2, Layers, FolderOpen, Upload } from "lucide-react";

const Create = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6">
        <h2 className="text-2xl font-bold">Create Content</h2>
        <p className="text-muted-foreground">Choose what you want to share</p>

        <div className="space-y-4">
          {/* Studio - New Pro Feature */}
          <button 
            onClick={() => navigate("/studio")}
            className="w-full glass-hover rounded-2xl p-8 flex items-center gap-4 group hover:scale-[1.02] transition-all relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 via-cyan-600/20 to-blue-600/20 animate-pulse" />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-500 flex items-center justify-center shadow-xl shadow-emerald-500/50 group-hover:shadow-emerald-500/70 transition-all relative">
              <Layers className="w-8 h-8 text-white" />
            </div>
            <div className="text-left flex-1 relative">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">Pro Studio</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold">PRO</span>
              </div>
              <p className="text-sm text-muted-foreground">Full editing suite: drafts, autosave, version history, scheduling</p>
            </div>
          </button>

          {/* Drafts */}
          <button 
            onClick={() => navigate("/drafts")}
            className="w-full glass-hover rounded-2xl p-6 flex items-center gap-4 group hover:scale-[1.02] transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold">My Drafts</h3>
              <p className="text-xs text-muted-foreground">Continue editing saved content</p>
            </div>
          </button>

          {/* Uploads */}
          <button 
            onClick={() => navigate("/uploads")}
            className="w-full glass-hover rounded-2xl p-6 flex items-center gap-4 group hover:scale-[1.02] transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold">Upload Queue</h3>
              <p className="text-xs text-muted-foreground">View and manage pending uploads</p>
            </div>
          </button>

          <div className="border-t border-border/50 pt-4">
            <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">Quick Create</p>
          </div>

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

          <button 
            onClick={() => navigate("/reel-editor-pro")}
            className="w-full glass-hover rounded-2xl p-8 flex items-center gap-4 group hover:scale-[1.02] transition-all relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-yellow-600/20 animate-pulse" />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-yellow-500 flex items-center justify-center shadow-xl shadow-purple-500/50 group-hover:shadow-purple-500/70 transition-all relative">
              <Wand2 className="w-8 h-8 text-white" />
            </div>
            <div className="text-left flex-1 relative">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">Reel Editor Pro</h3>
                <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold">NEW</span>
              </div>
              <p className="text-sm text-muted-foreground">Professional editing: trim, speed, filters, text, stickers, audio & more</p>
            </div>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Create;
