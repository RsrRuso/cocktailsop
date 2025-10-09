import { useState, useEffect } from "react";
import { Search, TrendingUp, Globe2 } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"top" | "accounts" | "regions">("top");

  useEffect(() => {
    fetchExplorePosts();
    fetchProfiles();
  }, []);

  const fetchExplorePosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select(`
        *,
        profiles (username, avatar_url, professional_title)
      `)
      .order("like_count", { ascending: false })
      .limit(20);

    if (data) setPosts(data);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("follower_count", { ascending: false })
      .limit(10);

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
          <button
            onClick={() => setActiveTab("regions")}
            className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
              activeTab === "regions"
                ? "glass glow-primary text-primary"
                : "glass-hover text-muted-foreground"
            }`}
          >
            <Globe2 className="w-4 h-4 inline mr-2" />
            Regions
          </button>
        </div>

        {/* Content Grid */}
        {activeTab === "top" && (
          <div className="grid grid-cols-3 gap-1">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="aspect-square glass-hover cursor-pointer rounded-lg overflow-hidden"
                onClick={() => navigate("/home")}
              >
                {post.media_urls?.[0] ? (
                  <img
                    src={post.media_urls[0]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-pink-600 to-orange-500 flex items-center justify-center p-4">
                    <p className="text-xs text-white line-clamp-4">{post.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "accounts" && (
          <div className="space-y-3">
            {filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                className="glass-hover rounded-2xl p-4 flex items-center gap-4 cursor-pointer"
                onClick={() => navigate("/profile")}
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-600 to-orange-500 flex items-center justify-center text-white font-bold text-xl">
                  {profile.username?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{profile.full_name}</h3>
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
            ))}
          </div>
        )}

        {activeTab === "regions" && (
          <div className="space-y-6">
            <div className="glass rounded-3xl p-6 border border-primary/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <Globe2 className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold">Explore by Region</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-3xl p-8 bg-gradient-to-br from-pink-600 to-rose-500 cursor-pointer hover:scale-105 transition-all shadow-xl">
                  <div className="text-5xl mb-3">🇺🇸</div>
                  <h3 className="text-2xl font-bold text-white mb-1">USA</h3>
                  <p className="text-sm text-white/80">{Math.floor(Math.random() * 3000) + 2000} professionals</p>
                </div>

                <div className="rounded-3xl p-8 bg-gradient-to-br from-blue-600 to-indigo-500 cursor-pointer hover:scale-105 transition-all shadow-xl">
                  <div className="text-5xl mb-3">🇬🇧</div>
                  <h3 className="text-2xl font-bold text-white mb-1">UK</h3>
                  <p className="text-sm text-white/80">{Math.floor(Math.random() * 2000) + 1500} professionals</p>
                </div>

                <div className="rounded-3xl p-8 bg-gradient-to-br from-emerald-600 to-teal-500 cursor-pointer hover:scale-105 transition-all shadow-xl">
                  <div className="text-5xl mb-3">🇪🇺</div>
                  <h3 className="text-2xl font-bold text-white mb-1">Europe</h3>
                  <p className="text-sm text-white/80">{Math.floor(Math.random() * 4000) + 3000} professionals</p>
                </div>

                <div className="rounded-3xl p-8 bg-gradient-to-br from-orange-600 to-amber-500 cursor-pointer hover:scale-105 transition-all shadow-xl">
                  <div className="text-5xl mb-3">🌏</div>
                  <h3 className="text-2xl font-bold text-white mb-1">Asia</h3>
                  <p className="text-sm text-white/80">{Math.floor(Math.random() * 5000) + 4000} professionals</p>
                </div>

                <div className="rounded-3xl p-8 bg-gradient-to-br from-purple-600 to-violet-500 cursor-pointer hover:scale-105 transition-all shadow-xl">
                  <div className="text-5xl mb-3">🌍</div>
                  <h3 className="text-2xl font-bold text-white mb-1">Middle East</h3>
                  <p className="text-sm text-white/80">{Math.floor(Math.random() * 2000) + 1000} professionals</p>
                </div>

                <div className="rounded-3xl p-8 bg-gradient-to-br from-yellow-600 to-orange-500 cursor-pointer hover:scale-105 transition-all shadow-xl">
                  <div className="text-5xl mb-3">🌍</div>
                  <h3 className="text-2xl font-bold text-white mb-1">Africa</h3>
                  <p className="text-sm text-white/80">{Math.floor(Math.random() * 1500) + 800} professionals</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Explore;
