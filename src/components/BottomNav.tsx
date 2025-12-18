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
              isActive("/home") 
                ? "text-primary" 
                : "text-white hover:text-primary"
            }`}
          >
            <Home className={`w-7 h-7 ${isActive("/home") ? "fill-current drop-shadow-[0_0_8px_hsl(var(--primary))]" : ""}`} />
            <span className="text-[10px] mt-0.5 font-semibold">Home</span>
          </button>

          <button
            onClick={() => navigate("/explore")}
            className={`flex flex-col items-center justify-center w-14 h-12 transition-all ${
              isActive("/explore") 
                ? "text-primary" 
                : "text-white hover:text-primary"
            }`}
          >
            <Search className={`w-7 h-7 ${isActive("/explore") ? "stroke-[2.5] drop-shadow-[0_0_8px_hsl(var(--primary))]" : ""}`} />
            <span className="text-[10px] mt-0.5 font-semibold">Explore</span>
          </button>

          <button
            onClick={() => navigate("/create/reel")}
            className="flex items-center justify-center -mt-3"
          >
            <div className="w-14 h-14 rounded-2xl border-2 border-white/80 hover:border-primary transition-all flex items-center justify-center">
              <PlusSquare className="w-8 h-8 text-white" />
            </div>
          </button>

          <button
            onClick={() => navigate("/map")}
            className={`flex flex-col items-center justify-center w-14 h-12 transition-all ${
              isActive("/map") 
                ? "text-primary" 
                : "text-white hover:text-primary"
            }`}
          >
            <MapPin className={`w-7 h-7 ${isActive("/map") ? "fill-current drop-shadow-[0_0_8px_hsl(var(--primary))]" : ""}`} />
            <span className="text-[10px] mt-0.5 font-semibold">Map</span>
          </button>

          <button
            onClick={() => navigate("/profile")}
            className={`flex flex-col items-center justify-center w-14 h-12 transition-all ${
              isActive("/profile") ? "" : ""
            }`}
          >
            <OptimizedAvatar
              src={avatarUrl}
              alt={username}
              fallback={username[0] || "U"}
              userId={userId}
              className={`w-8 h-8 ${isActive("/profile") ? "ring-2 ring-primary shadow-[0_0_12px_hsl(var(--primary)/0.6)]" : "ring-2 ring-white"}`}
              showStatus={false}
              showAddButton={false}
            />
            <span className={`text-[10px] mt-0.5 font-semibold ${isActive("/profile") ? "text-primary" : "text-white"}`}>Profile</span>
          </button>
        </div>
    </div>
  );
};

export default BottomNav;
