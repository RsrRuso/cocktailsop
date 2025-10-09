import { Home, PlusSquare, User, Briefcase } from "lucide-react";
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
          <Home className="w-6 h-6" />
          <span className="text-xs">Home</span>
        </button>

        <button
          onClick={() => navigate("/tools")}
          className={`flex flex-col items-center gap-1 transition-colors ${
            isActive("/tools") ? "text-primary glow-primary" : "text-muted-foreground"
          }`}
        >
          <Briefcase className="w-6 h-6" />
          <span className="text-xs">Tools</span>
        </button>

        <button
          onClick={() => navigate("/create")}
          className="flex flex-col items-center gap-1 -mt-8 glass-hover p-4 rounded-full glow-accent"
        >
          <PlusSquare className="w-8 h-8 text-accent" />
        </button>

        <button
          onClick={() => navigate("/profile")}
          className={`flex flex-col items-center gap-1 transition-colors ${
            isActive("/profile") ? "text-primary glow-primary" : "text-muted-foreground"
          }`}
        >
          <User className="w-6 h-6" />
          <span className="text-xs">Profile</span>
        </button>
      </div>
    </div>
  );
};

export default BottomNav;
