import { useState, useEffect, useRef } from "react";
import { Home, Plus, Search, Video, MapPin, User } from "lucide-react";
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
        if (scrollDelta < 0) {
          // Scrolling up (towards top) - hide nav
          setIsVisible(false);
        } else if (scrollDelta > 0) {
          // Scrolling down (towards bottom) - show nav
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
      {/* Transparent nav with bright elements */}
      <div className="flex items-center justify-around px-2 py-3 max-w-2xl mx-auto">
          <button
            onClick={() => {
              if (isActive("/home")) {
                window.scrollTo({ top: 0, behavior: 'instant' });
              } else {
                navigate("/home");
              }
            }}
            className={`flex flex-col items-center justify-center w-14 h-12 transition-all ${
              isActive("/home") ? "text-white" : "text-white/60"
            }`}
          >
            <Home className={`w-6 h-6 ${isActive("/home") ? "fill-current" : ""}`} />
            <span className="text-[9px] mt-0.5">Home</span>
          </button>

          <button
            onClick={() => navigate("/explore")}
            className={`flex flex-col items-center justify-center w-14 h-12 transition-all ${
              isActive("/explore") ? "text-white" : "text-white/60"
            }`}
          >
            <Search className={`w-6 h-6 ${isActive("/explore") ? "stroke-[2.5]" : ""}`} />
            <span className="text-[9px] mt-0.5">Explore</span>
          </button>

          <button
            onClick={() => navigate("/create/reel")}
            className="flex items-center justify-center -mt-2"
          >
            <Plus className="w-7 h-7 text-white/90 stroke-[2]" />
          </button>

          <button
            onClick={() => navigate("/map")}
            className={`flex flex-col items-center justify-center w-14 h-12 transition-all ${
              isActive("/map") ? "text-white" : "text-white/60"
            }`}
          >
            <MapPin className={`w-6 h-6 ${isActive("/map") ? "fill-current" : ""}`} />
            <span className="text-[9px] mt-0.5">Map</span>
          </button>

          <button
            onClick={() => navigate("/profile")}
            className="flex flex-col items-center justify-center w-14 h-12 transition-all"
          >
            <OptimizedAvatar
              src={avatarUrl}
              alt={username}
              fallback={username[0] || "U"}
              userId={userId}
              className={`w-7 h-7 ${isActive("/profile") ? "ring-[1.5px] ring-white" : "ring-1 ring-white/50"}`}
              showStatus={false}
              showAddButton={false}
            />
            <span className={`text-[9px] mt-0.5 ${isActive("/profile") ? "text-white" : "text-white/60"}`}>Profile</span>
          </button>
        </div>
    </div>
  );
};

export default BottomNav;
