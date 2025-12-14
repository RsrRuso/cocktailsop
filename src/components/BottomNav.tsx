import { useState, useEffect, useRef } from "react";
import { Home, PlusSquare, Search, Video, MapPin, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { useAuth } from "@/contexts/AuthContext";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  const isActive = (path: string) => location.pathname === path;

  // Hide bottom nav on fullscreen pages (Reels, Story Viewer)
  const hideOnRoutes = ['/reels', '/story-viewer'];
  const shouldHide = hideOnRoutes.some(route => location.pathname.startsWith(route));

  // Scroll detection for hide/show
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY.current;
      
      // Only trigger after scrolling more than 10px to avoid jitter
      if (Math.abs(scrollDelta) > 10) {
        if (scrollDelta > 0 && currentScrollY > 50) {
          // Scrolling down - hide nav
          setIsVisible(false);
        } else {
          // Scrolling up - show nav
          setIsVisible(true);
        }
        lastScrollY.current = currentScrollY;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset visibility on route change
  useEffect(() => {
    setIsVisible(true);
    lastScrollY.current = 0;
  }, [location.pathname]);
  
  if (shouldHide) {
    return null;
  }

  // Get avatar from profile or user metadata
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  const username = profile?.username || user?.user_metadata?.username || 'User';
  const userId = profile?.id || user?.id;

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div>
        <div className="flex items-center justify-around px-2 py-2 max-w-2xl mx-auto">
          <button
            onClick={() => {
              if (isActive("/home")) {
                window.scrollTo({ top: 0, behavior: 'instant' });
              } else {
                navigate("/home");
              }
            }}
            className={`flex items-center justify-center w-12 h-12 transition-all ${
              isActive("/home") 
                ? "text-white scale-110" 
                : "text-white/70 hover:text-white"
            }`}
          >
            <Home className={`w-7 h-7 ${isActive("/home") ? "fill-current" : ""}`} />
          </button>

          <button
            onClick={() => navigate("/explore")}
            className={`flex items-center justify-center w-12 h-12 transition-all ${
              isActive("/explore") 
                ? "text-white scale-110" 
                : "text-white/70 hover:text-white"
            }`}
          >
            <Search className={`w-7 h-7 ${isActive("/explore") ? "stroke-[2.5]" : ""}`} />
          </button>

          <button
            onClick={() => navigate("/create/reel")}
            className="flex items-center justify-center -mt-2"
          >
            <div className="w-12 h-12 rounded-xl border-2 border-white/20 hover:border-white/40 transition-all flex items-center justify-center bg-background">
              <PlusSquare className="w-7 h-7 text-white" />
            </div>
          </button>

          <button
            onClick={() => navigate("/map")}
            className={`flex items-center justify-center w-12 h-12 transition-all ${
              isActive("/map") 
                ? "text-white scale-110" 
                : "text-white/70 hover:text-white"
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
              className={`w-8 h-8 ${isActive("/profile") ? "ring-2 ring-white" : "ring-2 ring-white/50"}`}
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
