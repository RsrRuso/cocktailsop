import { useState, useEffect, useRef } from "react";
import { Home, Search, MapPin, Plus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import OptimizedAvatar from "@/components/OptimizedAvatar";
import { useAuth } from "@/contexts/AuthContext";
import svLogo from "@/assets/sv-logo-optimized.webp";

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
      <div className="flex items-center justify-around px-4 py-4 max-w-sm mx-auto">
          <button
            onClick={() => {
              if (isActive("/home")) {
                window.scrollTo({ top: 0, behavior: 'instant' });
              } else {
                navigate("/home");
              }
            }}
            className={`p-2 transition-all ${
              isActive("/home") ? "scale-110" : "opacity-80"
            }`}
          >
            <img 
              src={svLogo} 
              alt="Home" 
              className={`w-7 h-7 rounded-md object-contain ${isActive("/home") ? "ring-2 ring-primary" : ""}`}
              style={{
                filter: 'sepia(15%) saturate(1.2) hue-rotate(-5deg)',
                boxShadow: isActive("/home") ? '0 0 10px rgba(234, 179, 8, 0.4)' : 'none'
              }}
            />
          </button>

          <button
            onClick={() => navigate("/explore")}
            className={`p-2 transition-all ${
              isActive("/explore") ? "text-white" : "text-white/80"
            }`}
          >
            <Search className={`w-7 h-7 ${isActive("/explore") ? "stroke-[2.5]" : ""}`} />
          </button>

          <button
            onClick={() => navigate("/create/reel")}
            className="p-2 transition-all text-white"
          >
            <Plus className="w-8 h-8 stroke-[2.5]" />
          </button>

          <button
            onClick={() => navigate("/map")}
            className={`p-2 transition-all ${
              isActive("/map") ? "text-white" : "text-white/80"
            }`}
          >
            <MapPin className={`w-7 h-7 ${isActive("/map") ? "fill-current" : ""}`} />
          </button>

          <button
            onClick={() => navigate("/profile")}
            className="p-2 transition-all"
          >
            <OptimizedAvatar
              src={avatarUrl}
              alt={username}
              fallback={username[0] || "U"}
              userId={userId}
              className={`w-8 h-8 ${isActive("/profile") ? "ring-2 ring-white" : "ring-1 ring-white/70"}`}
              showStatus={false}
              showAddButton={false}
              showOnlineIndicator={false}
            />
          </button>
        </div>
    </div>
  );
};

export default BottomNav;
