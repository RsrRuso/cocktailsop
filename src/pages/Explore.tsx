import { useState, useEffect } from "react";
import { Search, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Explore = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"top" | "accounts">("top");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch posts only when they're needed (in background)
    Promise.all([fetchExplorePosts(), fetchProfiles()]).finally(() => setIsLoading(false));
  }, []);

  const fetchExplorePosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select("id, content, media_urls, like_count, comment_count, view_count, profiles(id, username, avatar_url, full_name)")
      .order("like_count", { ascending: false })
      .limit(18);

    if (data) setPosts(data);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, professional_title, follower_count")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setProfiles(data);
  };

  const filteredPosts = posts.filter(post => 
    post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProfiles = profiles.filter(profile =>
    profile.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.professional_title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search posts, people, regions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 glass border-primary/20 h-12 rounded-2xl"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("top")}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
              activeTab === "top"
                ? "glass glow-primary text-primary"
                : "glass-hover text-muted-foreground"
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Top
          </button>
          <button
            onClick={() => setActiveTab("accounts")}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
              activeTab === "accounts"
                ? "glass glow-primary text-primary"
                : "glass-hover text-muted-foreground"
            }`}
          >
            Accounts
          </button>
        </div>

        {/* Content Grid */}
        {activeTab === "top" && (
          <div className="grid grid-cols-3 gap-1">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
              ))
            ) : (
              filteredPosts.map((post) => (
              <div
                key={post.id}
                className="relative aspect-square glass-hover cursor-pointer rounded-lg overflow-hidden group"
                onClick={() => navigate(`/post/${post.id}`)}
              >
                {post.media_urls?.[0] ? (
                  <img
                    src={post.media_urls[0]}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-pink-600 to-orange-500 flex items-center justify-center p-4">
                    <p className="text-xs text-white line-clamp-4">{post.content}</p>
                  </div>
                )}
                
                {/* Overlay with author info and engagement */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
                  <div className="flex items-center gap-2">
                    {post.profiles?.avatar_url ? (
                      <img 
                        src={post.profiles.avatar_url} 
                        alt={post.profiles.username}
                        className="w-6 h-6 rounded-full border-2 border-white"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xs font-bold border-2 border-white">
                        {post.profiles?.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-white text-xs font-semibold drop-shadow-lg">
                      @{post.profiles?.username}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-white text-xs font-semibold">
                    <span className="flex items-center gap-1">
                      ❤️ {post.like_count}
                    </span>
                    <span className="flex items-center gap-1">
                      💬 {post.comment_count}
                    </span>
                  </div>
                </div>
              </div>
            ))
            )}
          </div>
        )}

        {activeTab === "accounts" && (
          <div className="space-y-3">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass rounded-2xl p-4 flex items-center gap-4 animate-pulse">
                  <div className="w-14 h-14 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                </div>
              ))
            ) : (
              filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                className="glass-hover rounded-2xl p-4 flex items-center gap-4 cursor-pointer"
                onClick={() => navigate(`/user/${profile.id}`)}
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-600 to-orange-500 flex items-center justify-center text-white font-bold text-xl">
                  {profile.username?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-normal text-sm">{profile.full_name}</h3>
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                  <p className="text-xs text-primary capitalize mt-1">
                    {profile.professional_title?.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{profile.follower_count}</p>
                  <p className="text-xs text-muted-foreground">followers</p>
                </div>
              </div>
            ))
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Explore;
