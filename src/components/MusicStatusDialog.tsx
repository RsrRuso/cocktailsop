import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Music2, Play, ExternalLink, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MusicStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  album_art: string;
  preview_url: string | null;
  spotify_url: string;
}

const MusicStatusDialog = ({ open, onOpenChange }: MusicStatusDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [popularTracks, setPopularTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchPopularMusic();
    }
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchSpotify(searchQuery);
      } else {
        setTracks([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchPopularMusic = async () => {
    try {
      const { data, error } = await supabase
        .from('music_library')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setPopularTracks(data.map(track => ({
          id: track.track_id || track.id,
          name: track.title,
          artist: track.artist,
          album: track.album || '',
          album_art: track.album_art || '',
          preview_url: track.preview_url,
          spotify_url: track.spotify_url || `https://open.spotify.com/track/${track.track_id}`,
        })));
      }
    } catch (error) {
      console.error('Error fetching popular music:', error);
    }
  };

  const searchSpotify = async (query: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-spotify-music', {
        body: { query, limit: 15 }
      });

      if (error) throw error;
      
      if (data?.tracks) {
        setTracks(data.tracks.map((track: any) => ({
          id: track.id,
          name: track.name,
          artist: track.artists?.[0]?.name || 'Unknown Artist',
          album: track.album?.name || '',
          album_art: track.album?.images?.[0]?.url || '',
          preview_url: track.preview_url,
          spotify_url: track.external_urls?.spotify || '',
        })));
      }
    } catch (error) {
      console.error('Error searching Spotify:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShareMusic = async (track: SpotifyTrack) => {
    setSharing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to share music",
          variant: "destructive",
        });
        return;
      }

      // Save music status to user_status with music data
      const { error } = await supabase
        .from('user_status')
        .upsert({
          user_id: session.user.id,
          status_text: `🎵 ${track.name}`,
          emoji: '🎵',
          music_track_id: track.id,
          music_track_name: track.name,
          music_artist: track.artist,
          music_album_art: track.album_art,
          music_preview_url: track.preview_url,
          music_spotify_url: track.spotify_url,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      toast({
        title: "Music shared!",
        description: `Now sharing "${track.name}" by ${track.artist}`,
      });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sharing music:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to share music",
        variant: "destructive",
      });
    } finally {
      setSharing(false);
    }
  };

  const displayTracks = searchQuery.trim().length >= 2 ? tracks : popularTracks;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music2 className="w-5 h-5 text-emerald-500" />
            Share Music
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search Spotify..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[400px] pr-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : displayTracks.length > 0 ? (
              <div className="space-y-2">
                {!searchQuery.trim() && (
                  <p className="text-xs text-muted-foreground mb-3">Popular tracks</p>
                )}
                {displayTracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors group"
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      {track.album_art ? (
                        <img
                          src={track.album_art}
                          alt={track.album}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                          <Music2 className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{track.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      {track.spotify_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(track.spotify_url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleShareMusic(track)}
                        disabled={sharing}
                        className="bg-emerald-500 hover:bg-emerald-600"
                      >
                        {sharing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Share"
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Music2 className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">Search for music to share</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MusicStatusDialog;