import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Repeat2 } from "lucide-react";

interface RepostedContent {
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

const Reposted = () => {
  const [repostedContent, setRepostedContent] = useState<RepostedContent[]>([]);

  useEffect(() => {
    fetchRepostedContent();
  }, []);

  const fetchRepostedContent = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*, profiles(username, full_name, avatar_url, professional_title, badge_level)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setRepostedContent(data);
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
    <div className="min-h-screen pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Repeat2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Reposted Content</h1>
            <p className="text-sm text-muted-foreground">Your archived shares</p>
          </div>
        </div>

        <div className="space-y-4">
          {repostedContent.map((post) => (
            <div key={post.id} className="glass rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className={`w-12 h-12 ring-2 ring-offset-2 ring-offset-background bg-gradient-to-br ${getBadgeColor(post.profiles.badge_level)}`}>
                    <AvatarImage src={post.profiles.avatar_url || undefined} />
                    <AvatarFallback>{post.profiles.username[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Repeat2 className="w-4 h-4 text-primary" />
                    <p className="text-sm text-muted-foreground">You reposted</p>
                  </div>
                  <p className="font-semibold">{post.profiles.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {post.profiles.professional_title?.replace(/_/g, " ")}
                  </p>
                </div>
              </div>

              <p className="text-sm">{post.content}</p>

              <div className="flex items-center gap-6 pt-2">
                <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                  <Heart className="w-5 h-5" />
                  <span className="text-sm">{post.like_count}</span>
                </button>
                <button className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">{post.comment_count}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Reposted;
