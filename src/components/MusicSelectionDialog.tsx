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
            <Youtube className="w-4 h-4 text-red-500" />
            Select Music
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
            <Input
              placeholder="Search..."
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
                  className="flex items-center gap-1.5 p-1.5 rounded-md hover:bg-accent transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate leading-tight">{track.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{track.artist}</p>
                  </div>
                  
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreview(track)}
                      className="h-6 w-6 p-0"
                      title="Preview"
                    >
                      <Youtube className="w-3.5 h-3.5" />
                    </Button>
                    
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
