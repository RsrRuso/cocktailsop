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
            {/* Outer glow layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 blur-xl opacity-60 group-hover:opacity-90 transition-all duration-500 animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-tl from-blue-300 via-cyan-400 to-purple-500 blur-lg opacity-40 group-hover:opacity-70 transition-all duration-500" />
            
            {/* Diamond container */}
            <div className="relative w-14 h-14 transform rotate-45 group-hover:rotate-[50deg] transition-all duration-500">
              {/* Diamond background with gradient */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-300 via-blue-400 to-purple-500 shadow-2xl">
                {/* Inner shine effect */}
                <div className="absolute inset-[2px] rounded-xl bg-gradient-to-br from-blue-50 via-cyan-100 to-blue-200 opacity-30" />
                {/* Top facet highlight */}
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/50 to-transparent rounded-t-xl" />
                {/* Center sparkle */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full shadow-lg group-hover:scale-150 transition-transform duration-300" />
                </div>
              </div>
              
              {/* Badge icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <BadgeCheck 
                  className="w-8 h-8 text-white drop-shadow-2xl -rotate-45 group-hover:-rotate-[50deg] transition-all duration-500" 
                  strokeWidth={2.5} 
                  fill="rgba(255,255,255,0.3)"
                />
              </div>
              
              {/* Edge highlights */}
              <div className="absolute inset-0 rounded-xl border-[3px] border-white/40 group-hover:border-white/60 transition-colors" />
            </div>
            
            {/* Sparkle effects */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-ping" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-ping delay-75" />
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
