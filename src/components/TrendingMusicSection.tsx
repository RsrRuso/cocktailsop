import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Play, Music2 } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent } from "./ui/dialog";

interface TrendingTrack {
  id: string;
  track_id: string;
  title: string;
  artist: string;
  genre: string | null;
  mood: string | null;
  preview_url: string | null;
  spotify_url: string | null;
  popularity_score: number | null;
  ai_tags: string[] | null;
  ai_description: string | null;
}

const TrendingMusicSection = () => {
  const [trendingTracks, setTrendingTracks] = useState<TrendingTrack[]>([]);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  useEffect(() => {
    fetchTrendingMusic();
  }, []);

  const fetchTrendingMusic = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_music_library')
        .select('*')
        .eq('is_active', true)
        .order('popularity_score', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTrendingTracks(data || []);
    } catch (error) {
      console.error('Error fetching trending music:', error);
    }
  };

  const handlePlayTrack = (trackId: string) => {
    setPlayingTrackId(trackId);
  };

  if (trendingTracks.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Trending Now</h2>
          <Badge variant="secondary" className="ml-auto">Hot 🔥</Badge>
        </div>

        <div className="grid gap-3">
          {trendingTracks.map((track, index) => (
            <Card key={track.id} className="glass p-4 hover:shadow-lg transition-all group">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 font-bold text-lg shrink-0">
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">{track.title}</h3>
                    {track.popularity_score && track.popularity_score > 80 && (
                      <Badge variant="destructive" className="text-xs">🔥</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-1">{track.artist}</p>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {track.genre && (
                      <Badge variant="outline" className="text-xs">{track.genre}</Badge>
                    )}
                    {track.mood && (
                      <Badge variant="outline" className="text-xs">{track.mood}</Badge>
                    )}
                    {track.ai_tags?.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {track.ai_description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {track.ai_description}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handlePlayTrack(track.track_id)}
                  className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent hover:scale-110 transition-transform flex items-center justify-center group-hover:shadow-lg"
                >
                  <Play className="w-5 h-5 text-primary-foreground fill-current" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!playingTrackId} onOpenChange={() => setPlayingTrackId(null)}>
        <DialogContent className="max-w-md">
          {playingTrackId && (
            <iframe
              src={`https://open.spotify.com/embed/track/${playingTrackId}`}
              width="100%"
              height="380"
              frameBorder="0"
              allow="encrypted-media"
              title="Spotify Player"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrendingMusicSection;
