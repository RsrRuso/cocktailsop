import { Home, PlusSquare, User, Briefcase, Video, BarChart3 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-primary/20">
      <div className="flex items-center justify-around px-4 py-3">
        <button
          onClick={() => navigate("/home")}
          className={`flex flex-col items-center gap-1 transition-colors ${
            isActive("/home") ? "text-primary glow-primary" : "text-muted-foreground"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-xs">Feed</span>
        </button>

        <button
          onClick={() => navigate("/tools")}
          className={`flex flex-col items-center gap-1 transition-colors ${
            isActive("/tools") ? "text-primary glow-primary" : "text-muted-foreground"
          }`}
        >
          <Briefcase className="w-5 h-5" />
          <span className="text-xs">Explore</span>
        </button>

        <button
          onClick={() => navigate("/create")}
          className="flex flex-col items-center gap-1 -mt-6"
        >
          <div className="w-14 h-14 rounded-2xl glass border border-white/20 flex items-center justify-center">
            <PlusSquare className="w-7 h-7 text-foreground" />
          </div>
        </button>

        <button
          onClick={() => navigate("/profile")}
          className={`flex flex-col items-center gap-1 transition-colors ${
            isActive("/profile") ? "text-primary glow-primary" : "text-muted-foreground"
          }`}
        >
          <Video className="w-5 h-5" />
          <span className="text-xs">Reels</span>
        </button>

        <button
          onClick={() => navigate("/tools")}
          className={`flex flex-col items-center gap-1 transition-colors ${
            isActive("/tools") ? "text-primary glow-primary" : "text-muted-foreground"
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-xs">Ops</span>
        </button>
      </div>
    </div>
  );
};

export default BottomNav;
