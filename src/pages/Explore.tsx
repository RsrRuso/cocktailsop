import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Search, Grid3X3, User } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Input } from "@/components/ui/input";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useVerifiedUsers } from "@/hooks/useVerifiedUsers";

// Memoized Post Grid Item - minimal, no rounded corners like Instagram
const PostGridItem = memo(({ post, onClick }: { post: any; onClick: () => void }) => (
  <div
    className="relative aspect-square cursor-pointer overflow-hidden bg-neutral-100 dark:bg-neutral-900"
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
      <div className="w-full h-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center p-2">
        <p className="text-[10px] text-neutral-600 dark:text-neutral-400 line-clamp-3 text-center">{post.content}</p>
      </div>
    )}
    {/* Minimal hover overlay */}
    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-sm font-semibold">
      <span className="flex items-center gap-1">
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        {post.like_count || 0}
      </span>
      <span className="flex items-center gap-1">
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"/></svg>
        {post.comment_count || 0}
      </span>
    </div>
  </div>
));

PostGridItem.displayName = 'PostGridItem';

// Memoized Profile Item - clean, minimal
const ProfileItem = memo(
  ({
    profile,
    isVerified,
    onClick,
  }: {
    profile: any;
    isVerified: boolean;
    onClick: () => void;
  }) => (
    <div
      className="py-3 px-4 flex items-center gap-3 cursor-pointer active:bg-neutral-100 dark:active:bg-neutral-900 transition-colors"
      onClick={onClick}
    >
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt=""
          className="w-11 h-11 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
          loading="lazy"
        />
      ) : (
        <div className="w-11 h-11 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400 font-medium text-base">
          {profile.username?.[0]?.toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate flex items-center gap-1">
          {profile.username}
          {isVerified && <VerifiedBadge size="xs" />}
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{profile.full_name}</p>
      </div>
    </div>
  )
);

ProfileItem.displayName = 'ProfileItem';

const Explore = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"top" | "accounts">("top");
  const [isLoading, setIsLoading] = useState(true);

  const { isVerified } = useVerifiedUsers(profiles.map((p) => p.id));

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      try {
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
            .limit(30),
        ]);

        if (postsRes.error) throw postsRes.error;
        if (profilesRes.error) throw profilesRes.error;

        if (!cancelled) {
          setPosts(postsRes.data ?? []);
          setProfiles(profilesRes.data ?? []);
        }
      } catch (error: any) {
        console.error("Explore fetch error:", error);
        toast.error("Couldn’t load Explore. Please try again.");
        if (!cancelled) {
          setPosts([]);
          setProfiles([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
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
    <div className="min-h-screen bg-background pb-16 pt-14">
      <TopNav />

      <div className="max-w-2xl mx-auto">
        {/* Search - Instagram style */}
        <div className="px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" strokeWidth={1.5} />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-900 border-0 text-sm placeholder:text-neutral-400 focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Tabs - minimal underline style */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800">
          <button
            onClick={() => setActiveTab("top")}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wide transition-colors relative ${
              activeTab === "top" ? "text-foreground" : "text-neutral-400"
            }`}
          >
            <Grid3X3 className="w-4 h-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">Top</span>
            {activeTab === "top" && (
              <div className="absolute bottom-0 left-0 right-0 h-px bg-foreground" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("accounts")}
            className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wide transition-colors relative ${
              activeTab === "accounts" ? "text-foreground" : "text-neutral-400"
            }`}
          >
            <User className="w-4 h-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">Accounts</span>
            {activeTab === "accounts" && (
              <div className="absolute bottom-0 left-0 right-0 h-px bg-foreground" />
            )}
          </button>
        </div>

        {/* Content */}
        {activeTab === "top" && (
          <div className="grid grid-cols-3 gap-px bg-neutral-200 dark:bg-neutral-800">
            {isLoading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-square bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
              ))
            ) : filteredPosts.length === 0 ? (
              <div className="col-span-3 bg-background text-center py-16 text-neutral-500 text-sm">
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
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="py-3 px-4 flex items-center gap-3 animate-pulse">
                  <div className="w-11 h-11 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-800 rounded" />
                    <div className="h-2.5 w-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
                  </div>
                </div>
              ))
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-16 text-neutral-500 text-sm">
                No accounts found
              </div>
            ) : (
              filteredProfiles.map((profile) => (
                <ProfileItem
                  key={profile.id}
                  profile={profile}
                  isVerified={isVerified(profile.id)}
                  onClick={() => handleProfileClick(profile.id)}
                />
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
