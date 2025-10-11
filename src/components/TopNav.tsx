import { Bell, MessageCircle, Send, Sun, Moon, Menu, Palette, Calculator, BookOpen, FileText, Package, DollarSign, ClipboardCheck, Shield, Users, ShoppingCart, Megaphone, Wrench, Phone, Calendar, Apple, Trash2, GraduationCap, Receipt, PartyPopper, BadgeCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getProfessionalBadge } from "@/lib/profileUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BadgeInfoDialog from "@/components/BadgeInfoDialog";

const TopNav = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth(); // Use cached auth
  const [currentUser, setCurrentUser] = useState<any>(profile);
  const [userRoles, setUserRoles] = useState({ isFounder: false, isVerified: false });
  const professionalBadge = getProfessionalBadge(currentUser?.professional_title || null);
  const BadgeIcon = professionalBadge.icon;
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [theme, setTheme] = useState<'light' | 'grey' | 'dark' | 'black'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'grey' | 'dark' | 'black') || 'dark';
  });
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const initializeNav = async () => {
      // Use cached profile
      if (profile && isMounted) {
        setCurrentUser(profile);
        
        // Fetch user roles in background (non-blocking)
        if (user) {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);
          
          if (rolesData && isMounted) {
            setUserRoles({
              isFounder: rolesData.some(r => r.role === 'founder'),
              isVerified: rolesData.some(r => r.role === 'verified')
            });
          }
        }
      }
      
      // Fetch counts in background
      await Promise.all([
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
  }, [user, profile]);

  const fetchUnreadNotifications = async () => {
    if (!user) return;

    const { count } = await supabase
      .from("notifications")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .neq("type", "message");

    setUnreadNotificationsCount(count || 0);
  };

  const fetchUnreadMessages = async () => {
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
        {userRoles.isFounder ? (
          <div 
            className="relative group cursor-pointer w-14 h-14"
            onClick={() => setBadgeDialogOpen(true)}
          >
            {/* Simplified glow */}
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full blur-md opacity-60 group-hover:opacity-80 transition-opacity" />
            
            {/* Diamond shape using CSS only */}
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-200 via-blue-400 to-purple-500 transform rotate-45 rounded-sm shadow-lg group-hover:scale-110 transition-transform" />
              <div className="absolute w-2 h-2 bg-white rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
          </div>
        ) : userRoles.isVerified && (
          <div 
            className="relative group cursor-pointer"
            onClick={() => setBadgeDialogOpen(true)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary blur-md opacity-75 group-hover:opacity-100 transition-opacity rounded-xl" />
            <div className="relative w-12 h-12 bg-gradient-to-br from-primary to-accent flex items-center justify-center transform rotate-45 rounded-lg shadow-lg group-hover:scale-110 transition-transform">
              <BadgeCheck className="w-7 h-7 text-primary-foreground -rotate-45" strokeWidth={2.5} />
            </div>
          </div>
        )}

        <BadgeInfoDialog
          open={badgeDialogOpen}
          onOpenChange={setBadgeDialogOpen}
          isFounder={userRoles.isFounder}
          isVerified={userRoles.isVerified}
          badgeLevel={currentUser?.badge_level}
          username={currentUser?.username}
          isOwnProfile={true}
        />

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
