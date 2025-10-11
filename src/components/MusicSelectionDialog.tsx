import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Music, Play, Check, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface MusicSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MusicTrack {
  id: string;
  track_id: string;
  title: string;
  artist: string;
  duration: string;
  preview_url: string | null;
}

const MusicSelectionDialog = ({ open, onOpenChange }: MusicSelectionDialogProps) => {
  const { user } = useAuth();
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [popularTracks, setPopularTracks] = useState<MusicTrack[]>([]);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (open) {
      fetchPopularMusic();
    }
  }, [open]);

  const fetchPopularMusic = async () => {
    const { data, error } = await supabase
      .from("popular_music")
      .select("*")
      .order("title", { ascending: true });

    if (!error && data) {
      setPopularTracks(data);
    }
  };

  const filteredTracks = popularTracks.filter(
    (track) =>
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlayPause = (track: MusicTrack) => {
    if (playingTrack === track.track_id) {
      audioRef.current?.pause();
      setPlayingTrack(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = track.preview_url || "";
        audioRef.current.play();
        setPlayingTrack(track.track_id);
      }
    }
  };

  const handleSelectTrack = async (track: MusicTrack) => {
    if (!user) {
      toast.error("Please log in to share music");
      return;
    }

    setSelectedTrack(track.track_id);

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

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Choose Music
          </DialogTitle>
        </DialogHeader>

        <audio ref={audioRef} onEnded={() => setPlayingTrack(null)} />

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Search music..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-xl glass border border-primary/20 focus:outline-none focus:border-primary/40"
          />

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredTracks.map((track) => (
              <div
                key={track.id}
                className="w-full p-4 rounded-xl glass hover:bg-primary/10 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Music className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">{track.title}</div>
                    <div className="text-sm opacity-70">{track.artist}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm opacity-50">{track.duration}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPause(track);
                    }}
                    className="p-2 rounded-full hover:bg-primary/20 transition-colors"
                  >
                    {playingTrack === track.track_id ? (
                      <Pause className="w-5 h-5 text-primary" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleSelectTrack(track)}
                    className="p-2 rounded-full hover:bg-green-500/20 transition-colors"
                  >
                    {selectedTrack === track.track_id ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Check className="w-5 h-5 opacity-0 group-hover:opacity-50 transition-opacity" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MusicSelectionDialog;
