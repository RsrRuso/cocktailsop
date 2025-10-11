import { useEffect, useState, useRef } from "react";
import { Music, Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OptimizedAvatar from "./OptimizedAvatar";
import { useHaptic } from "@/hooks/useHaptic";

interface MusicShare {
  id: string;
  user_id: string;
  track_id: string;
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
  const { lightTap } = useHaptic();
  const [musicShares, setMusicShares] = useState<MusicShare[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    const { data: sharesData, error } = await supabase
      .from("music_shares")
      .select("*")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && sharesData) {
      // Fetch profiles for each share
      const userIds = sharesData.map(share => share.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      // Fetch track info from popular_music
      const trackIds = sharesData.map(share => share.track_id);
      const { data: tracksData } = await supabase
        .from("popular_music")
        .select("track_id, preview_url")
        .in("track_id", trackIds);

      // Merge the data
      const enrichedShares = sharesData.map(share => ({
        ...share,
        preview_url: tracksData?.find(t => t.track_id === share.track_id)?.preview_url || null,
        profiles: profilesData?.find(p => p.id === share.user_id) || {
          username: "Unknown",
          avatar_url: null
        }
      }));

      setMusicShares(enrichedShares as any);
    }
  };

  const handlePlayPause = (share: any) => {
    lightTap();
    if (playingId === share.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current && share.preview_url) {
        audioRef.current.src = share.preview_url;
        audioRef.current.play();
        setPlayingId(share.id);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  if (musicShares.length === 0) return null;

  return (
    <div className="border-b border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 overflow-hidden">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />
      <div className="flex items-center gap-4 px-4 py-2 animate-fade-in">
        <Music className="w-4 h-4 text-primary animate-pulse" />
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
          {musicShares.map((share) => (
            <button
              key={share.id}
              onClick={() => handlePlayPause(share)}
              className="flex items-center gap-2 whitespace-nowrap flex-shrink-0 animate-scale-in hover:bg-primary/10 rounded-full px-3 py-1 transition-all group"
            >
              <OptimizedAvatar
                src={share.profiles?.avatar_url || ""}
                alt={share.profiles?.username || "User"}
                className="w-6 h-6"
              />
              <div className="text-sm flex items-center gap-2">
                <span className="font-semibold">{share.profiles?.username}</span>
                <span className="opacity-70">•</span>
                <span className="opacity-90">{share.track_title}</span>
                <span className="opacity-50 text-xs">by {share.track_artist}</span>
                {playingId === share.id ? (
                  <Pause className="w-4 h-4 text-primary ml-2" />
                ) : (
                  <Play className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity ml-2" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MusicTicker;
