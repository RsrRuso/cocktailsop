import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send } from "lucide-react";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface Post {
  id: string;
  content: string;
  media_urls: string[];
  like_count: number;
  comment_count: number;
  created_at: string;
  profiles: {
    username: string;
    full_name: string;
    avatar_url: string | null;
    professional_title: string | null;
    badge_level: string;
  };
}

const Home = () => {
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchStories();
    fetchPosts();
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

  const fetchStories = async () => {
    const { data } = await supabase
      .from("stories")
      .select("*, profiles(username, avatar_url)")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) setStories(data);
  };

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*, profiles(username, full_name, avatar_url, professional_title, badge_level)")
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) setPosts(data);
  };

  const getBadgeColor = (level: string) => {
    const colors = {
      bronze: "from-amber-700 to-amber-500",
      silver: "from-gray-400 to-gray-200",
      gold: "from-yellow-500 to-yellow-300",
      platinum: "from-blue-400 to-purple-500",
    };
    return colors[level as keyof typeof colors] || colors.bronze;
  };

  const regions = [
    { name: "USA", flag: "🇺🇸", gradient: "from-pink-600 to-pink-400" },
    { name: "UK", flag: "🇬🇧", gradient: "from-blue-600 to-purple-500" },
    { name: "Europe", flag: "🇪🇺", gradient: "from-green-600 to-teal-500" },
    { name: "Asia", flag: "🌏", gradient: "from-orange-600 to-amber-700" },
    { name: "Middle East", flag: "🌍", gradient: "from-yellow-600 to-orange-500" },
    { name: "Africa", flag: "🌍", gradient: "from-purple-600 to-pink-500" },
  ];

  return (
    <div className="min-h-screen pb-20 pt-16">
      <TopNav />

      {/* Stories */}
      <div className="px-4 py-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-4">
          {/* Your Story */}
          <div className="flex flex-col items-center gap-2 min-w-[80px]">
            <button
              onClick={() => navigate("/create")}
              className="relative group"
            >
              <div className="w-16 h-16 rounded-full glass border-2 border-border flex items-center justify-center">
                <Avatar className="w-14 h-14">
                  <AvatarImage src={currentUser?.avatar_url || undefined} />
                  <AvatarFallback>{currentUser?.username?.[0] || "Y"}</AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-background glow-primary">
                <span className="text-white text-lg font-bold">+</span>
              </div>
            </button>
            <span className="text-xs text-muted-foreground">Your Story</span>
          </div>

          {/* Other Stories */}
          {stories.map((story) => (
            <div key={story.id} className="flex flex-col items-center gap-2 min-w-[80px]">
              <div className="relative group cursor-pointer">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 opacity-75 blur group-hover:opacity-100 transition-all duration-300 animate-pulse"></div>
                <div className="relative rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-0.5 shadow-xl shadow-orange-500/50">
                  <div className="bg-background rounded-full p-0.5">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={story.profiles.avatar_url || undefined} />
                      <AvatarFallback>{story.profiles.username[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>
              <span className="text-xs text-foreground font-medium truncate w-full text-center">
                {story.profiles.username}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Explore by Region */}
      <div className="px-4 py-6">
        <div className="glass rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold">Explore by Region</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {regions.map((region) => (
              <button
                key={region.name}
                className={`glass-hover rounded-3xl p-8 text-left bg-gradient-to-br ${region.gradient} relative overflow-hidden group transition-transform hover:scale-105`}
              >
                <div className="relative z-10">
                  <div className="text-5xl mb-4">{region.flag}</div>
                  <h3 className="text-2xl font-bold text-white">{region.name}</h3>
                </div>
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      {posts.length > 0 && (
        <div className="space-y-6 px-4">
          {posts.map((post) => (
            <div key={post.id} className="glass rounded-2xl p-4 space-y-4">
              {/* Post Header */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className={`w-12 h-12 avatar-glow ring-2 ring-offset-2 ring-offset-background bg-gradient-to-br ${getBadgeColor(post.profiles.badge_level)}`}>
                    <AvatarImage src={post.profiles.avatar_url || undefined} />
                    <AvatarFallback>{post.profiles.username[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{post.profiles.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {post.profiles.professional_title?.replace(/_/g, " ")}
                  </p>
                </div>
              </div>

              {/* Post Content */}
              <p className="text-sm">{post.content}</p>

              {/* Post Actions */}
              <div className="flex items-center gap-6 pt-2">
                <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                  <Heart className="w-5 h-5" />
                  <span className="text-sm">{post.like_count}</span>
                </button>
                <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">{post.comment_count}</span>
                </button>
                <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default Home;
