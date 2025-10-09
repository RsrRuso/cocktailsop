import { Home, PlusSquare, Briefcase, Repeat2, Wrench } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="glass backdrop-blur-xl border-t border-primary/20 bg-background/80">
        <div className="flex items-center justify-around px-2 py-2">
          <button
            onClick={() => navigate("/home")}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${
              isActive("/home") 
                ? "bg-primary/20 text-primary glow-primary" 
                : "text-muted-foreground hover:bg-accent/50"
            }`}
          >
            <Home className={`w-6 h-6 ${isActive("/home") ? "fill-current" : ""}`} />
            <span className="text-xs font-medium">Feed</span>
          </button>

          <button
            onClick={() => navigate("/explore")}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${
              isActive("/explore") 
                ? "bg-primary/20 text-primary glow-primary" 
                : "text-muted-foreground hover:bg-accent/50"
            }`}
          >
            <Briefcase className={`w-6 h-6 ${isActive("/explore") ? "fill-current" : ""}`} />
            <span className="text-xs font-medium">Explore</span>
          </button>

          <button
            onClick={() => navigate("/create")}
            className="flex flex-col items-center gap-1 -mt-8"
          >
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary via-accent to-secondary border-4 border-background shadow-2xl flex items-center justify-center hover:scale-110 transition-all glow-primary">
              <PlusSquare className="w-8 h-8 text-white" />
            </div>
          </button>

          <button
            onClick={() => navigate("/reposted")}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${
              isActive("/reposted") 
                ? "bg-primary/20 text-primary glow-primary" 
                : "text-muted-foreground hover:bg-accent/50"
            }`}
          >
            <Repeat2 className={`w-6 h-6 ${isActive("/reposted") ? "fill-current" : ""}`} />
            <span className="text-xs font-medium">Reposted</span>
          </button>

          <button
            onClick={() => navigate("/ops-tools")}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${
              isActive("/ops-tools") 
                ? "bg-primary/20 text-primary glow-primary" 
                : "text-muted-foreground hover:bg-accent/50"
            }`}
          >
            <Wrench className={`w-6 h-6 ${isActive("/ops-tools") ? "fill-current" : ""}`} />
            <span className="text-xs font-medium">Ops</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
