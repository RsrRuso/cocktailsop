import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Search, TrendingUp, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

// Memoized Post Grid Item
const PostGridItem = memo(({ post, onClick }: { post: any; onClick: () => void }) => (
  <div
    className="relative aspect-square cursor-pointer rounded-lg overflow-hidden bg-muted"
    onClick={onClick}
  >
    {post.media_urls?.[0] ? (
      <img
        src={post.media_urls[0]}
        alt=""
        className="w-full h-full object-cover"
        loading="lazy"
        decoding="async"
      />
    ) : (
      <div className="w-full h-full bg-gradient-to-br from-primary/60 to-accent/60 flex items-center justify-center p-2">
        <p className="text-[10px] text-white line-clamp-3 text-center">{post.content}</p>
      </div>
    )}
    {/* Simple overlay on hover - CSS only */}
    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs font-medium">
      <span>❤️ {post.like_count || 0}</span>
      <span>💬 {post.comment_count || 0}</span>
    </div>
  </div>
));

PostGridItem.displayName = 'PostGridItem';

// Memoized Profile Item
const ProfileItem = memo(({ profile, onClick }: { profile: any; onClick: () => void }) => (
  <div
    className="rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors active:scale-[0.99]"
    onClick={onClick}
  >
    {profile.avatar_url ? (
      <img src={profile.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" loading="lazy" />
    ) : (
      <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
        {profile.username?.[0]?.toUpperCase()}
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm truncate">{profile.full_name || profile.username}</p>
      <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
    </div>
    <div className="text-right shrink-0">
      <p className="text-xs font-medium">{profile.follower_count || 0}</p>
      <p className="text-[10px] text-muted-foreground">followers</p>
    </div>
  </div>
));

ProfileItem.displayName = 'ProfileItem';

const Explore = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"top" | "accounts">("top");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [postsRes, profilesRes] = await Promise.all([
        supabase
          .from("posts")
          .select("id, content, media_urls, like_count, comment_count")
          .order("like_count", { ascending: false })
          .limit(24),
        supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, follower_count")
          .order("follower_count", { ascending: false })
          .limit(30)
      ]);
      
      if (postsRes.data) setPosts(postsRes.data);
      if (profilesRes.data) setProfiles(profilesRes.data);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const filteredPosts = useMemo(() => {
    if (!searchQuery) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter(post => post.content?.toLowerCase().includes(q));
  }, [posts, searchQuery]);

  const filteredProfiles = useMemo(() => {
    if (!searchQuery) return profiles;
    const q = searchQuery.toLowerCase();
    return profiles.filter(p => 
      p.username?.toLowerCase().includes(q) || 
      p.full_name?.toLowerCase().includes(q)
    );
  }, [profiles, searchQuery]);

  const handlePostClick = useCallback((id: string) => navigate(`/post/${id}`), [navigate]);
  const handleProfileClick = useCallback((id: string) => navigate(`/user/${id}`), [navigate]);

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-3 py-4 space-y-4 max-w-2xl mx-auto">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-muted/50 border-0"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("top")}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "top" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-1.5" />
            Top
          </button>
          <button
            onClick={() => setActiveTab("accounts")}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "accounts" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
            }`}
          >
            <Users className="w-4 h-4 inline mr-1.5" />
            Accounts
          </button>
        </div>

        {/* Content */}
        {activeTab === "top" && (
          <div className="grid grid-cols-3 gap-0.5">
            {isLoading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square bg-muted animate-pulse" />
              ))
            ) : filteredPosts.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-muted-foreground text-sm">
                No posts found
              </div>
            ) : (
              filteredPosts.map((post) => (
                <PostGridItem key={post.id} post={post} onClick={() => handlePostClick(post.id)} />
              ))
            )}
          </div>
        )}

        {activeTab === "accounts" && (
          <div className="space-y-0.5">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-3 flex items-center gap-3 animate-pulse">
                  <div className="w-11 h-11 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 bg-muted rounded" />
                    <div className="h-2.5 w-16 bg-muted rounded" />
                  </div>
                </div>
              ))
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No accounts found
              </div>
            ) : (
              filteredProfiles.map((profile) => (
                <ProfileItem key={profile.id} profile={profile} onClick={() => handleProfileClick(profile.id)} />
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
