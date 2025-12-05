import { useState, useEffect } from "react";
import { Drawer, DrawerPortal, DrawerOverlay } from "@/components/ui/drawer";
import { Drawer as DrawerPrimitive } from "vaul";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Music2, ExternalLink, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
        .from('music_library' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setPopularTracks((data as any[]).map((track: any) => ({
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
          id: track.id || track.track_id,
          name: track.title || track.name,
          artist: track.artist || track.artists?.[0]?.name || 'Unknown Artist',
          album: track.album || '',
          album_art: track.preview_url || track.album?.images?.[0]?.url || '',
          preview_url: track.preview_audio || track.preview_url || null,
          spotify_url: track.spotify_url || track.external_urls?.spotify || '',
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerPortal>
        <DrawerOverlay />
        <DrawerPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex flex-col bg-background/98 backdrop-blur-xl",
            "h-[90vh] max-h-[90vh] rounded-t-3xl border-0 outline-none"
          )}
        >
          {/* Custom Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/40" />
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Music2 className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold">Share Music</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-secondary/50"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="px-5 pb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search Spotify..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-2xl bg-secondary/60 border-0 text-base focus-visible:ring-2 focus-visible:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Track List */}
          <div className="flex-1 overflow-y-auto px-5 pb-safe">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
              </div>
            ) : displayTracks.length > 0 ? (
              <div className="space-y-3 pb-8">
                {!searchQuery.trim() && (
                  <p className="text-sm text-muted-foreground mb-4 font-medium">Popular tracks</p>
                )}
                {displayTracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-4 p-3 rounded-2xl bg-secondary/40 active:bg-secondary/70 transition-all active:scale-[0.98]"
                  >
                    {/* Album Art */}
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-lg">
                      {track.album_art ? (
                        <img
                          src={track.album_art}
                          alt={track.album}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                          <Music2 className="w-7 h-7 text-white" />
                        </div>
                      )}
                    </div>
                    
                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base truncate">{track.name}</p>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">{track.artist}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {track.spotify_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-full"
                          onClick={() => window.open(track.spotify_url, '_blank')}
                        >
                          <ExternalLink className="w-5 h-5" />
                        </Button>
                      )}
                      <Button
                        onClick={() => handleShareMusic(track)}
                        disabled={sharing}
                        className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 rounded-full px-5 h-10 font-semibold text-sm"
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
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <div className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center mb-5">
                  <Music2 className="w-12 h-12 opacity-50" />
                </div>
                <p className="text-base font-medium">Search for music</p>
                <p className="text-sm mt-1 opacity-70">Find songs on Spotify to share</p>
              </div>
            )}
          </div>
        </DrawerPrimitive.Content>
      </DrawerPortal>
    </Drawer>
  );
};

export default MusicStatusDialog;
