import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Check, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MusicSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MusicTrack {
  id: string;
  track_id: string; // Spotify ID or YouTube video ID
  title: string;
  artist: string;
  duration: string;
  preview_url: string | null; // Album art or thumbnail URL
  spotify_url?: string; // Spotify track URL
  preview_audio?: string | null; // 30s audio preview
}

const MusicSelectionDialog = ({ open, onOpenChange }: MusicSelectionDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [popularTracks, setPopularTracks] = useState<MusicTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (open && searchQuery.trim() === '') {
      fetchPopularMusic();
    } else {
      setPreviewVideoId(null);
    }
  }, [open]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim() !== '') {
        searchSpotify();
      } else {
        fetchPopularMusic();
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const fetchPopularMusic = async () => {
    const { data, error } = await supabase
      .from("popular_music")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setPopularTracks(data);
    }
  };

  const searchSpotify = async () => {
    try {
      console.log('Searching Spotify for:', searchQuery);
      
      const { data, error } = await supabase.functions.invoke('search-spotify-music', {
        body: { query: searchQuery }
      });

      if (error) {
        console.error('Error searching Spotify:', error);
        toast.error("Failed to search Spotify");
        return;
      }

      if (data?.tracks) {
        console.log('Found tracks:', data.tracks.length);
        setPopularTracks(data.tracks);
      }
    } catch (error) {
      console.error('Error searching Spotify:', error);
      toast.error("Failed to search music");
    }
  };

  const filteredTracks = popularTracks;

  const handlePreview = (track: MusicTrack) => {
    console.log('Preview clicked for track:', track.track_id, track.title);
    if (previewVideoId === track.track_id) {
      setPreviewVideoId(null);
    } else {
      setPreviewVideoId(track.track_id);
    }
  };

  const handleSelectTrack = async (track: MusicTrack) => {
    setSelectedTrack(track);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please log in to share music");
      setSelectedTrack(null);
      return;
    }

    const { error } = await supabase.from("music_shares").insert({
      user_id: user.id,
      track_id: track.track_id,
      track_title: track.title,
      track_artist: track.artist,
    });

    if (error) {
      toast.error("Failed to share music");
      console.error(error);
      setSelectedTrack(null);
      return;
    }

    toast.success(`✓ Now sharing: ${track.title}`);
    setTimeout(() => {
      onOpenChange(false);
      setSelectedTrack(null);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm max-h-[65vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5 text-base">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Search Spotify
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
            <Input
              placeholder="Search songs, artists, albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {previewVideoId && (
            <div className="space-y-1.5">
              <div className="rounded-md overflow-hidden bg-black">
                <iframe
                  width="100%"
                  height="160"
                  src={`https://www.youtube.com/embed/${previewVideoId}?autoplay=1`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewVideoId(previewVideoId)}
                className="w-full h-7 text-xs"
              >
                Replay
              </Button>
            </div>
          )}

          <ScrollArea className="h-[240px]">
            <div className="space-y-0.5 pr-2">
              {filteredTracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors"
                >
                  {track.preview_url && (
                    <img 
                      src={track.preview_url} 
                      alt={track.title}
                      className="w-10 h-10 object-cover rounded"
                    />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate leading-tight">{track.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{track.artist}</p>
                  </div>
                  
                  <div className="flex items-center gap-0.5">
                    {track.spotify_url ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(track.spotify_url, '_blank')}
                        className="h-6 w-6 p-0"
                        title="Open in Spotify"
                      >
                        <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                        </svg>
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(track)}
                        className="h-6 w-6 p-0"
                        title="Preview"
                      >
                        <Youtube className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    
                    <Button
                      variant={selectedTrack?.id === track.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSelectTrack(track)}
                      disabled={!!selectedTrack}
                      className="h-6 px-2 text-[10px] transition-all"
                    >
                      {selectedTrack?.id === track.id ? (
                        <span className="flex items-center gap-1 animate-scale-in">
                          <Check className="w-3 h-3" />
                          <span>Added</span>
                        </span>
                      ) : (
                        "Add"
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MusicSelectionDialog;
