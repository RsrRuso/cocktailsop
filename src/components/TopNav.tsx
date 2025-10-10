import { Bell, MessageCircle, Send, Sun, Moon, Menu, Palette, Calculator, BookOpen, FileText, Package, DollarSign, ClipboardCheck, Shield, Users, ShoppingCart, Megaphone, Wrench, Phone, Calendar, Apple, Trash2, GraduationCap, Receipt, PartyPopper } from "lucide-react";
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
  const [theme, setTheme] = useState<'light' | 'grey' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'grey' | 'dark') || 'dark';
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

  const changeTheme = (newTheme: 'light' | 'grey' | 'dark') => {
    const html = document.documentElement;
    html.classList.remove('light', 'grey', 'dark');
    html.classList.add(newTheme);
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 glass border-b border-primary/20">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-yellow-500 flex items-center justify-center">
          <span className="text-2xl">🌙</span>
        </div>

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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="glass-hover p-2.5 rounded-2xl">
                <Menu className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass w-64 max-h-96 overflow-y-auto">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Professional Tools
              </div>
              <DropdownMenuItem onClick={() => navigate("/tools")}>
                <Calculator className="w-4 h-4 mr-2" />
                Batch Calculator
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tools")}>
                <BookOpen className="w-4 h-4 mr-2" />
                Recipe Manager
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tools")}>
                <FileText className="w-4 h-4 mr-2" />
                Reports & Analytics
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tools")}>
                <Package className="w-4 h-4 mr-2" />
                Inventory Management
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tools")}>
                <DollarSign className="w-4 h-4 mr-2" />
                Cost Calculator
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tools")}>
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Quality Control
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tools")}>
                <Shield className="w-4 h-4 mr-2" />
                Compliance Tracker
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tools")}>
                <Users className="w-4 h-4 mr-2" />
                Staff Scheduler
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tools")}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Order Manager
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tools")}>
                <Megaphone className="w-4 h-4 mr-2" />
                Marketing Planner
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tools")}>
                <Wrench className="w-4 h-4 mr-2" />
                Equipment Log
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tools")}>
                <Phone className="w-4 h-4 mr-2" />
                Supplier Manager
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tools")}>
                <Calendar className="w-4 h-4 mr-2" />
                Seasonal Planner
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tools")}>
                <Apple className="w-4 h-4 mr-2" />
                Nutrition Calculator
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tools")}>
                <Trash2 className="w-4 h-4 mr-2" />
                Waste Tracker
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tools")}>
                <GraduationCap className="w-4 h-4 mr-2" />
                Training Resources
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tools")}>
                <Receipt className="w-4 h-4 mr-2" />
                Invoice Generator
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/tools")}>
                <PartyPopper className="w-4 h-4 mr-2" />
                Event Booking
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default TopNav;
