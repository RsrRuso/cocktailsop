import { Bell, MessageCircle, Send, Sun, Moon, Menu, Palette, Calculator, BookOpen, FileText, Package, DollarSign, ClipboardCheck, Shield, Users, ShoppingCart, Megaphone, Wrench, Phone, Calendar, Apple, Trash2, GraduationCap, Receipt, PartyPopper, BadgeCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TopNav = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [theme, setTheme] = useState<'light' | 'grey' | 'dark' | 'black'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'grey' | 'dark' | 'black') || 'dark';
  });

  useEffect(() => {
    let isMounted = true;
    
    const initializeNav = async () => {
      await Promise.all([
        fetchCurrentUser(),
        fetchUnreadNotifications(),
        fetchUnreadMessages()
      ]);
    };

    initializeNav();

    // Set up realtime subscriptions with debouncing
    let updateTimeout: NodeJS.Timeout;
    const debouncedUpdate = (callback: () => void) => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(callback, 1000);
    };

    const notificationsChannel = supabase
      .channel('topnav-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          if (isMounted) debouncedUpdate(fetchUnreadNotifications);
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel('topnav-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          if (isMounted) debouncedUpdate(fetchUnreadMessages);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearTimeout(updateTimeout);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    if (data) setCurrentUser(data);
  };

  const fetchUnreadNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { count } = await supabase
      .from("notifications")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id)
      .eq("read", false);

    setUnreadNotificationsCount(count || 0);
  };

  const fetchUnreadMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { count } = await supabase
      .from("messages")
      .select("*", { count: 'exact', head: true })
      .eq("read", false)
      .neq("sender_id", user.id);

    setUnreadMessagesCount(count || 0);
  };

  const changeTheme = (newTheme: 'light' | 'grey' | 'dark' | 'black') => {
    const html = document.documentElement;
    html.classList.remove('light', 'grey', 'dark', 'black');
    html.classList.add(newTheme);
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 glass border-b border-primary/20">
      <div className="flex items-center justify-between px-4 py-3">
        {currentUser?.is_founder ? (
          <div className="relative group cursor-pointer">
            {/* Multi-layer radiant glow system */}
            <div className="absolute -inset-6 bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-500 blur-3xl opacity-60 group-hover:opacity-100 transition-all duration-500 animate-pulse" />
            <div className="absolute -inset-5 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 blur-2xl opacity-40 group-hover:opacity-70 transition-all duration-700" style={{ animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
            <div className="absolute -inset-4 bg-gradient-conic from-cyan-400 via-white via-blue-500 via-purple-500 via-pink-400 to-cyan-400 opacity-30 animate-spin" style={{ animationDuration: '4s' }} />
            <div className="absolute -inset-3 bg-gradient-conic from-transparent via-white to-transparent opacity-30 animate-spin" style={{ animationDuration: '2s' }} />
            
            {/* Rainbow prismatic ring */}
            <div className="absolute -inset-2 rounded-full" style={{
              background: 'conic-gradient(from 0deg, #ff0080, #ff8c00, #ffed00, #00ff66, #00ccff, #cc00ff, #ff0080)',
              opacity: 0.25,
              filter: 'blur(8px)',
              animation: 'spin 6s linear infinite'
            }} />
            
            {/* Diamond container with rotation */}
            <div className="relative w-14 h-16 animate-[spin_6s_linear_infinite] group-hover:animate-[spin_3s_linear_infinite]">
              {/* Main diamond body */}
              <svg viewBox="0 0 100 120" className="w-full h-full" style={{ filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.8)) drop-shadow(0 0 40px rgba(147, 51, 234, 0.6))' }}>
                {/* Top facet (table) with shimmer */}
                <polygon 
                  points="50,10 70,35 50,30 30,35" 
                  fill="url(#diamond-gradient-1)"
                  className="transition-all duration-500"
                >
                  <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" />
                </polygon>
                
                {/* Upper girdle facets with light sweep */}
                <polygon points="30,35 10,50 50,30" fill="url(#diamond-gradient-2)">
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="1.2s" repeatCount="indefinite" begin="0s" />
                </polygon>
                <polygon points="70,35 90,50 50,30" fill="url(#diamond-gradient-3)">
                  <animate attributeName="opacity" values="0.6;1;0.6" dur="1.2s" repeatCount="indefinite" begin="0.4s" />
                </polygon>
                <polygon points="50,30 30,35 50,60" fill="url(#diamond-gradient-4)">
                  <animate attributeName="opacity" values="0.7;1;0.7" dur="1.4s" repeatCount="indefinite" begin="0.2s" />
                </polygon>
                <polygon points="50,30 70,35 50,60" fill="url(#diamond-gradient-5)">
                  <animate attributeName="opacity" values="0.7;1;0.7" dur="1.4s" repeatCount="indefinite" begin="0.6s" />
                </polygon>
                
                {/* Lower facets (pavilion) with depth */}
                <polygon points="10,50 50,60 50,110" fill="url(#diamond-gradient-6)" className="group-hover:opacity-100">
                  <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2s" repeatCount="indefinite" />
                </polygon>
                <polygon points="90,50 50,60 50,110" fill="url(#diamond-gradient-7)" className="group-hover:opacity-100">
                  <animate attributeName="opacity" values="0.5;0.9;0.5" dur="2s" repeatCount="indefinite" begin="1s" />
                </polygon>
                <polygon points="30,35 10,50 50,60" fill="url(#diamond-gradient-8)">
                  <animate attributeName="opacity" values="0.7;1;0.7" dur="1.3s" repeatCount="indefinite" begin="0.3s" />
                </polygon>
                <polygon points="70,35 90,50 50,60" fill="url(#diamond-gradient-9)">
                  <animate attributeName="opacity" values="0.7;1;0.7" dur="1.3s" repeatCount="indefinite" begin="1s" />
                </polygon>
                
                {/* Dynamic light streaks */}
                <polygon points="45,12 48,30 52,30 55,12" fill="rgba(255,255,255,0.95)">
                  <animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" repeatCount="indefinite" />
                </polygon>
                <line x1="50" y1="30" x2="50" y2="60" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5">
                  <animate attributeName="opacity" values="0;1;0" dur="1.2s" repeatCount="indefinite" />
                </line>
                
                {/* Sparkle points */}
                <circle cx="35" cy="40" r="3" fill="white">
                  <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" />
                  <animate attributeName="r" values="2;3;2" dur="1s" repeatCount="indefinite" />
                </circle>
                <circle cx="65" cy="42" r="2.5" fill="white">
                  <animate attributeName="opacity" values="0;1;0" dur="1.2s" repeatCount="indefinite" begin="0.5s" />
                  <animate attributeName="r" values="1.5;2.5;1.5" dur="1.2s" repeatCount="indefinite" begin="0.5s" />
                </circle>
                <circle cx="50" cy="25" r="2" fill="rgba(255,255,255,0.95)">
                  <animate attributeName="opacity" values="0;1;0" dur="0.9s" repeatCount="indefinite" begin="0.2s" />
                </circle>
                <circle cx="50" cy="70" r="2" fill="rgba(147, 197, 253, 0.9)">
                  <animate attributeName="opacity" values="0;1;0" dur="1.1s" repeatCount="indefinite" begin="0.4s" />
                </circle>
                
                <defs>
                  {/* Enhanced gradients with prismatic colors */}
                  <linearGradient id="diamond-gradient-1" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="30%" stopColor="#e0f7ff" />
                    <stop offset="100%" stopColor="#7dd3fc" />
                  </linearGradient>
                  <linearGradient id="diamond-gradient-2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="50%" stopColor="#93c5fd" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                  <linearGradient id="diamond-gradient-3" x1="100%" y1="0%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="50%" stopColor="#c4b5fd" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  <linearGradient id="diamond-gradient-4" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                    <stop offset="20%" stopColor="#bae6fd" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                  </linearGradient>
                  <linearGradient id="diamond-gradient-5" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#faf5ff" stopOpacity="0.9" />
                    <stop offset="20%" stopColor="#ddd6fe" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                  <linearGradient id="diamond-gradient-6" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#0369a1" />
                  </linearGradient>
                  <linearGradient id="diamond-gradient-7" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#6d28d9" />
                  </linearGradient>
                  <linearGradient id="diamond-gradient-8" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7dd3fc" />
                    <stop offset="50%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>
                  <linearGradient id="diamond-gradient-9" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#e9d5ff" />
                    <stop offset="50%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#9333ea" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Rotating light reflections - multiple layers */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 animate-[spin_1.5s_linear_infinite]" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-cyan-200 to-transparent opacity-30 animate-[spin_2s_linear_infinite_reverse]" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
              
              {/* Floating sparkles around diamond - enhanced */}
              <div className="absolute -top-1 right-0 w-2.5 h-2.5 bg-white rounded-full animate-ping" style={{ animationDuration: '1.2s', boxShadow: '0 0 10px #fff' }} />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-cyan-300 rounded-full animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.2s', boxShadow: '0 0 8px #67e8f9' }} />
              <div className="absolute top-1 -left-1 w-1.5 h-1.5 bg-blue-200 rounded-full animate-ping" style={{ animationDuration: '1.4s', animationDelay: '0.4s', boxShadow: '0 0 6px #bfdbfe' }} />
              <div className="absolute top-4 -right-1 w-1.5 h-1.5 bg-purple-300 rounded-full animate-ping" style={{ animationDuration: '1.3s', animationDelay: '0.6s', boxShadow: '0 0 6px #d8b4fe' }} />
              <div className="absolute bottom-3 right-1 w-1 h-1 bg-pink-300 rounded-full animate-ping" style={{ animationDuration: '1.6s', animationDelay: '0.8s', boxShadow: '0 0 5px #f9a8d4' }} />
              <div className="absolute -top-1 left-2 w-1 h-1 bg-yellow-200 rounded-full animate-ping" style={{ animationDuration: '1.1s', animationDelay: '1s', boxShadow: '0 0 5px #fef08a' }} />
            </div>
          </div>
        ) : currentUser?.is_verified && (
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary blur-md opacity-75 group-hover:opacity-100 transition-opacity rounded-xl" />
            <div className="relative w-12 h-12 bg-gradient-to-br from-primary to-accent flex items-center justify-center transform rotate-45 rounded-lg shadow-lg group-hover:scale-110 transition-transform">
              <BadgeCheck className="w-7 h-7 text-primary-foreground -rotate-45" strokeWidth={2.5} />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/notifications")}
            className="glass-hover p-2.5 rounded-2xl relative"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </div>
            )}
          </button>

          <button
            onClick={() => navigate("/messages")}
            className="glass-hover p-2.5 rounded-2xl relative"
          >
            <Send className="w-5 h-5" />
            {unreadMessagesCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
              </div>
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="glass-hover p-2.5 rounded-2xl">
                <Palette className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass">
              <DropdownMenuItem onClick={() => changeTheme('light')}>
                <Sun className="w-4 h-4 mr-2" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeTheme('grey')}>
                <Palette className="w-4 h-4 mr-2" />
                Grey
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeTheme('dark')}>
                <Moon className="w-4 h-4 mr-2" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeTheme('black')}>
                <Moon className="w-4 h-4 mr-2 fill-current" />
                Black
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button onClick={() => navigate("/profile")}>
            <Avatar className="w-10 h-10 ring-2 ring-primary/30">
              <AvatarImage 
                src={currentUser?.avatar_url || undefined}
                loading="eager"
              />
              <AvatarFallback>{currentUser?.username?.[0] || "U"}</AvatarFallback>
            </Avatar>
          </button>

          <button 
            onClick={() => navigate("/ops-tools")}
            className="glass-hover px-3 py-2 rounded-2xl font-semibold text-sm"
          >
            OPS
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopNav;
