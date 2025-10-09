import { Bell, MessageCircle, Send, Sun, Moon, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const TopNav = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    fetchCurrentUser();
    fetchUnreadNotifications();
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

    if (count) setUnreadCount(count);
  };

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      setIsDark(false);
    } else {
      html.classList.add('dark');
      setIsDark(true);
    }
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
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {unreadCount}
              </div>
            )}
          </button>

          <button
            onClick={() => navigate("/messages")}
            className="glass-hover p-2.5 rounded-2xl"
          >
            <Send className="w-5 h-5" />
          </button>

          <button onClick={toggleTheme} className="glass-hover p-2.5 rounded-2xl">
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button onClick={() => navigate("/profile")}>
            <Avatar className="w-10 h-10 ring-2 ring-primary/30">
              <AvatarImage src={currentUser?.avatar_url || undefined} />
              <AvatarFallback>{currentUser?.username?.[0] || "U"}</AvatarFallback>
            </Avatar>
          </button>

          <button className="glass-hover p-2.5 rounded-2xl">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopNav;
