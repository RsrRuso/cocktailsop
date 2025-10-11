import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Music, Play, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface MusicSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
}

const popularTracks: MusicTrack[] = [
  { id: "1", title: "Blinding Lights", artist: "The Weeknd", duration: "3:20" },
  { id: "2", title: "As It Was", artist: "Harry Styles", duration: "2:47" },
  { id: "3", title: "Heat Waves", artist: "Glass Animals", duration: "3:59" },
  { id: "4", title: "Levitating", artist: "Dua Lipa", duration: "3:23" },
  { id: "5", title: "Stay", artist: "The Kid LAROI, Justin Bieber", duration: "2:21" },
  { id: "6", title: "Good 4 U", artist: "Olivia Rodrigo", duration: "2:58" },
  { id: "7", title: "Peaches", artist: "Justin Bieber ft. Daniel Caesar", duration: "3:18" },
  { id: "8", title: "drivers license", artist: "Olivia Rodrigo", duration: "4:02" },
  { id: "9", title: "Save Your Tears", artist: "The Weeknd", duration: "3:36" },
  { id: "10", title: "Montero", artist: "Lil Nas X", duration: "2:17" },
];

const MusicSelectionDialog = ({ open, onOpenChange }: MusicSelectionDialogProps) => {
  const { user } = useAuth();
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTracks = popularTracks.filter(
    (track) =>
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectTrack = async (track: MusicTrack) => {
    if (!user) {
      toast.error("Please log in to share music");
      return;
    }

    setSelectedTrack(track.id);

    const { error } = await supabase.from("music_shares").insert({
      user_id: user.id,
      track_id: track.id,
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
      <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Choose Music
          </DialogTitle>
        </DialogHeader>

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
              <button
                key={track.id}
                onClick={() => handleSelectTrack(track)}
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
                <div className="flex items-center gap-2">
                  <span className="text-sm opacity-50">{track.duration}</span>
                  {selectedTrack === track.id ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Play className="w-5 h-5 opacity-0 group-hover:opacity-50 transition-opacity" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MusicSelectionDialog;
