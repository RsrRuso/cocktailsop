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
  track_id: string; // YouTube video ID
  title: string;
  artist: string; // YouTube channel name
  duration: string;
  preview_url: string | null; // Thumbnail URL
}

const MusicSelectionDialog = ({ open, onOpenChange }: MusicSelectionDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [popularTracks, setPopularTracks] = useState<MusicTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchPopularMusic();
    } else {
      setPreviewVideoId(null);
    }
  }, [open]);

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

  const filteredTracks = popularTracks.filter(
    (track) =>
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePreview = (track: MusicTrack) => {
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
      return;
    }

    toast.success(`Now sharing: ${track.title}`);
    setTimeout(() => {
      onOpenChange(false);
      setSelectedTrack(null);
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-500" />
            Select Music from YouTube
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search for tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {previewVideoId && (
            <div className="rounded-lg overflow-hidden bg-black">
              <iframe
                width="100%"
                height="400"
                src={`https://www.youtube.com/embed/${previewVideoId}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {filteredTracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  {track.preview_url && (
                    <img 
                      src={track.preview_url} 
                      alt={track.title}
                      className="w-20 h-20 object-cover rounded shrink-0"
                    />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{track.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                    <p className="text-xs text-muted-foreground">{track.duration}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreview(track)}
                      className="shrink-0"
                    >
                      <Youtube className="w-4 h-4 mr-1" />
                      {previewVideoId === track.track_id ? "Close" : "Preview"}
                    </Button>
                    
                    <Button
                      variant={selectedTrack?.id === track.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSelectTrack(track)}
                      className="shrink-0"
                    >
                      {selectedTrack?.id === track.id ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Selected
                        </>
                      ) : (
                        "Select"
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
