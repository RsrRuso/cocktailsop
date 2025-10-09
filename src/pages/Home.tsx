import { useEffect, useState } from "react";
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
  const [stories, setStories] = useState<Story[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    fetchStories();
    fetchPosts();
  }, []);

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

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      {/* Stories */}
      <div className="px-4 py-4 overflow-x-auto">
        <div className="flex gap-4">
          {stories.map((story) => (
            <div key={story.id} className="flex flex-col items-center gap-2 min-w-[80px]">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-accent p-0.5 glow-primary">
                  <div className="bg-background rounded-full p-0.5">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={story.profiles.avatar_url || undefined} />
                      <AvatarFallback>{story.profiles.username[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>
              <span className="text-xs text-muted-foreground truncate w-full text-center">
                {story.profiles.username}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="glass mx-4 rounded-2xl p-4 space-y-4">
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

      <BottomNav />
    </div>
  );
};

export default Home;
