import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Music, 
  Play, 
  Pause, 
  Search, 
  TrendingUp, 
  Clock,
  Check,
  Loader2,
  Volume2
} from "lucide-react";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";

interface MusicTrack {
  id: string;
  title: string;
  uploaded_by: string;
  original_url: string | null;
  preview_url: string | null;
  duration_sec: number | null;
  category: string;
  tags: string[];
  created_at: string;
  profiles?: {
    username: string;
  } | null;
  music_popularity?: {
    usage_count: number;
    usage_score: number;
  } | null;
}

interface MusicSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (track: MusicTrack | null) => void;
  selectedTrack?: MusicTrack | null;
}

export default function MusicSelector({ 
  open, 
  onOpenChange, 
  onSelect,
  selectedTrack 
}: MusicSelectorProps) {
  const isMobile = useIsMobile();
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("trending");
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (open) {
      fetchTracks();
    }
    return () => {
      audioRef.current?.pause();
      setPlayingTrackId(null);
    };
  }, [open]);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("music_tracks")
        .select(`
          *,
          profiles:uploaded_by(username),
          music_popularity(usage_count, usage_score)
        `)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTracks(data || []);
    } catch (error) {
      console.error("Error fetching tracks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = (track: MusicTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    const audioUrl = track.preview_url || track.original_url;
    if (!audioUrl) return;

    if (playingTrackId === track.id) {
      audioRef.current?.pause();
      setPlayingTrackId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingTrackId(null);
      setPlayingTrackId(track.id);
    }
  };

  const handleSelect = (track: MusicTrack) => {
    audioRef.current?.pause();
    setPlayingTrackId(null);
    onSelect(track);
    onOpenChange(false);
  };

  const getSortedTracks = () => {
    let filtered = [...tracks];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    switch (activeTab) {
      case "trending":
        return filtered.sort((a, b) => {
          const scoreA = a.music_popularity?.usage_score || 0;
          const scoreB = b.music_popularity?.usage_score || 0;
          return scoreB - scoreA;
        });
      case "new":
        return filtered.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      default:
        return filtered;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const TrackItem = ({ track }: { track: MusicTrack }) => {
    const isPlaying = playingTrackId === track.id;
    const isSelected = selectedTrack?.id === track.id;
    const usageCount = track.music_popularity?.usage_count || 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-3 rounded-xl border transition-all cursor-pointer ${
          isSelected 
            ? "bg-primary/10 border-primary" 
            : "bg-card/50 border-border/50 hover:border-primary/30"
        }`}
        onClick={() => handleSelect(track)}
      >
        <div className="flex items-center gap-3">
          {/* Play button */}
          <button
            onClick={(e) => handlePlayPause(track, e)}
            className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-primary" />
            ) : (
              <Play className="w-4 h-4 text-primary" />
            )}
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate text-sm">{track.title}</span>
              {isSelected && (
                <Check className="w-4 h-4 text-primary shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>@{track.profiles?.username || "unknown"}</span>
              <span>•</span>
              <span>{formatDuration(track.duration_sec)}</span>
              {usageCount > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    <Volume2 className="w-3 h-3" />
                    {usageCount}
                  </span>
                </>
              )}
            </div>
          </div>

          <Badge variant="secondary" className="text-xs capitalize shrink-0">
            {track.category}
          </Badge>
        </div>
      </motion.div>
    );
  };

  const content = (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search sounds..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="trending" className="gap-1 text-sm">
            <TrendingUp className="w-3 h-3" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="new" className="gap-1 text-sm">
            <Clock className="w-3 h-3" />
            New
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tracks list */}
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : getSortedTracks().length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No sounds found
          </div>
        ) : (
          getSortedTracks().map(track => (
            <TrackItem key={track.id} track={track} />
          ))
        )}
      </div>

      {/* Clear selection button */}
      {selectedTrack && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            onSelect(null);
            onOpenChange(false);
          }}
        >
          Remove Music
        </Button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              Add Music
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            Add Music
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
