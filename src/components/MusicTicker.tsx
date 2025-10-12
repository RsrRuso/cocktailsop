import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import OptimizedAvatar from "./OptimizedAvatar";
import { Youtube } from "lucide-react";
import { Dialog, DialogContent } from "./ui/dialog";

interface MusicShare {
  id: string;
  user_id: string;
  track_id: string;
  track_title: string;
  track_artist: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
  track?: {
    track_id: string;
    preview_url: string | null;
  };
}

const MusicTicker = () => {
  const [musicShares, setMusicShares] = useState<MusicShare[]>([]);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

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
        profile:profiles(username, avatar_url),
        track:popular_music!music_shares_track_id_fkey(track_id, preview_url)
      `)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setMusicShares(data as any);
    }
  };

  const handlePlayVideo = (videoId: string) => {
    console.log('Opening YouTube player for video:', videoId);
    setPlayingVideoId(videoId);
  };

  if (musicShares.length === 0) return null;

  return (
    <>
      <div className="w-full overflow-hidden py-3 bg-background/50 backdrop-blur-sm border-y border-border">
        <div className="flex gap-4 animate-scroll">
          {musicShares.map((share, index) => {
            const track = share.track;
            if (!track) return null;

            return (
              <div
                key={`${share.id}-${index}`}
                className="flex items-center gap-3 px-4 py-2 bg-card rounded-lg border border-border shrink-0 min-w-[320px] hover:bg-accent/50 transition-colors animate-fade-in cursor-pointer"
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
                onClick={() => handlePlayVideo(track.track_id)}
              >
                {track.preview_url && (
                  <img 
                    src={track.preview_url} 
                    alt={share.track_title}
                    className="w-16 h-16 object-cover rounded shrink-0"
                  />
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <OptimizedAvatar
                      src={share.profile?.avatar_url}
                      alt={share.profile?.username || 'User'}
                      className="w-4 h-4 inline-block"
                    />
                    @{share.profile?.username || 'Unknown'} shared
                  </p>
                  <p className="font-medium text-sm truncate">{share.track_title}</p>
                  <p className="text-xs text-muted-foreground truncate">{share.track_artist}</p>
                </div>

                <Youtube className="w-5 h-5 text-red-500 shrink-0" />
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!playingVideoId} onOpenChange={() => setPlayingVideoId(null)}>
        <DialogContent className="max-w-4xl">
          {playingVideoId && (
            <div className="rounded-lg overflow-hidden bg-black">
              <iframe
                width="100%"
                height="500"
                src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MusicTicker;
