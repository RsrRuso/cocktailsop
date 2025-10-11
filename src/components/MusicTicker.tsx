import { useEffect, useState } from "react";
import { Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OptimizedAvatar from "./OptimizedAvatar";

interface MusicShare {
  id: string;
  user_id: string;
  track_title: string;
  track_artist: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

const MusicTicker = () => {
  const { user } = useAuth();
  const [musicShares, setMusicShares] = useState<MusicShare[]>([]);

  useEffect(() => {
    fetchMusicShares();

    const channel = supabase
      .channel("music_shares_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "music_shares",
        },
        () => {
          fetchMusicShares();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMusicShares = async () => {
    const { data, error } = await supabase
      .from("music_shares")
      .select(`
        *,
        profiles:user_id (
          username,
          avatar_url
        )
      `)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setMusicShares(data);
    }
  };

  if (musicShares.length === 0) return null;

  return (
    <div className="border-b border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-2 animate-fade-in">
        <Music className="w-4 h-4 text-primary animate-pulse" />
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
          {musicShares.map((share) => (
            <div
              key={share.id}
              className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 animate-scale-in"
            >
              <OptimizedAvatar
                src={share.profiles?.avatar_url || ""}
                alt={share.profiles?.username || "User"}
                className="w-6 h-6"
              />
              <div className="text-sm">
                <span className="font-semibold">{share.profiles?.username}</span>
                <span className="opacity-70 mx-1">•</span>
                <span className="opacity-90">{share.track_title}</span>
                <span className="opacity-50 text-xs ml-1">by {share.track_artist}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MusicTicker;
