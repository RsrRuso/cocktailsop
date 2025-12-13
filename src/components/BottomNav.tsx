import { Home, PlusSquare, Search, Video, MapPin, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { useAuth } from "@/contexts/AuthContext";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  // Hide bottom nav on fullscreen pages (Reels, Story Viewer)
  const hideOnRoutes = ['/reels', '/story-viewer'];
  const shouldHide = hideOnRoutes.some(route => location.pathname.startsWith(route));
  
  if (shouldHide) {
    return null;
  }

  // Get avatar from profile or user metadata
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const username = profile?.username || user?.user_metadata?.username || 'User';
  const userId = profile?.id || user?.id;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div>
        <div className="flex items-center justify-around px-2 py-2 max-w-2xl mx-auto">
          <button
            onClick={() => {
              if (isActive("/home")) {
                // Just scroll to top instantly - no refresh
                window.scrollTo({ top: 0, behavior: 'instant' });
              } else {
                navigate("/home");
              }
            }}
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
            onClick={() => navigate("/map")}
            className={`flex items-center justify-center w-12 h-12 transition-all ${
              isActive("/map") 
                ? "text-foreground scale-110" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapPin className={`w-7 h-7 ${isActive("/map") ? "fill-current" : ""}`} />
          </button>

          <button
            onClick={() => navigate("/profile")}
            className={`flex items-center justify-center w-12 h-12 transition-all ${
              isActive("/profile") 
                ? "scale-110" 
                : ""
            }`}
          >
            <OptimizedAvatar
              src={avatarUrl}
              alt={username}
              fallback={username[0] || "U"}
              userId={userId}
              className={`w-8 h-8 ${isActive("/profile") ? "ring-2 ring-foreground" : "ring-2 ring-muted-foreground/50"}`}
              showStatus={false}
              showAddButton={false}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
