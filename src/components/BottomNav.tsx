import { Home, PlusSquare, Search, Video, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="glass backdrop-blur-xl border-t border-border/50 bg-background/95">
        <div className="flex items-center justify-around px-2 py-2 max-w-2xl mx-auto">
          <button
            onClick={() => navigate("/home")}
            className={`flex items-center justify-center w-12 h-12 transition-all ${
              isActive("/home") 
                ? "text-foreground scale-110" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Home className={`w-7 h-7 ${isActive("/home") ? "fill-current" : ""}`} />
          </button>

          <button
            onClick={() => navigate("/explore")}
            className={`flex items-center justify-center w-12 h-12 transition-all ${
              isActive("/explore") 
                ? "text-foreground scale-110" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className={`w-7 h-7 ${isActive("/explore") ? "stroke-[2.5]" : ""}`} />
          </button>

          <button
            onClick={() => navigate("/create")}
            className="flex items-center justify-center -mt-2"
          >
            <div className="w-12 h-12 rounded-xl border-2 border-foreground/20 hover:border-foreground/40 transition-all flex items-center justify-center bg-background">
              <PlusSquare className="w-7 h-7 text-foreground" />
            </div>
          </button>

          <button
            onClick={() => navigate("/reels")}
            className={`flex items-center justify-center w-12 h-12 transition-all ${
              isActive("/reels") 
                ? "text-foreground scale-110" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Video className={`w-7 h-7 ${isActive("/reels") ? "fill-current" : ""}`} />
          </button>

          <button
            onClick={() => navigate("/profile")}
            className={`flex items-center justify-center w-12 h-12 transition-all ${
              isActive("/profile") 
                ? "text-foreground scale-110" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className={`w-7 h-7 rounded-full border-2 ${
              isActive("/profile") 
                ? "border-foreground" 
                : "border-muted-foreground"
            } overflow-hidden`}>
              <div className="w-full h-full bg-gradient-to-br from-primary to-accent" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
