import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Music, 
  Play, 
  Pause, 
  Check, 
  X, 
  Clock,
  User,
  FileAudio,
  Loader2,
  Shield
} from "lucide-react";
import { motion } from "framer-motion";

interface PendingTrack {
  id: string;
  title: string;
  uploaded_by: string;
  original_url: string | null;
  preview_url: string | null;
  duration_sec: number | null;
  category: string;
  tags: string[];
  status: string;
  format: string | null;
  file_size_bytes: number | null;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
    email: string | null;
  };
}

export default function MusicBoxAdmin() {
  const { user } = useAuth();
  const [pendingTracks, setPendingTracks] = useState<PendingTrack[]>([]);
  const [allTracks, setAllTracks] = useState<PendingTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "founder", "moderator"]);

      if (error) throw error;
      setIsAdmin(data && data.length > 0);

      if (data && data.length > 0) {
        fetchPendingTracks();
        fetchAllTracks();
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingTracks = async () => {
    try {
      const { data, error } = await supabase
        .from("music_tracks")
        .select(`
          *,
          profiles:uploaded_by(username, avatar_url, email)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPendingTracks(data || []);
    } catch (error) {
      console.error("Error fetching pending tracks:", error);
    }
  };

  const fetchAllTracks = async () => {
    try {
      const { data, error } = await supabase
        .from("music_tracks")
        .select(`
          *,
          profiles:uploaded_by(username, avatar_url, email)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setAllTracks(data || []);
    } catch (error) {
      console.error("Error fetching all tracks:", error);
    }
  };

  const handlePlayPause = (track: PendingTrack) => {
    const audioUrl = track.preview_url || track.original_url;
    if (!audioUrl) {
      toast.error("No audio available");
      return;
    }

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

  const handleApprove = async (trackId: string) => {
    setProcessingId(trackId);
    try {
      const { error } = await supabase
        .from("music_tracks")
        .update({ status: "approved" })
        .eq("id", trackId);

      if (error) throw error;
      toast.success("Track approved and published!");
      fetchPendingTracks();
      fetchAllTracks();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve track");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (trackId: string) => {
    setProcessingId(trackId);
    try {
      const { error } = await supabase
        .from("music_tracks")
        .update({ status: "rejected" })
        .eq("id", trackId);

      if (error) throw error;
      toast.success("Track rejected");
      fetchPendingTracks();
      fetchAllTracks();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject track");
    } finally {
      setProcessingId(null);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "Unknown";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <TopNav />
        <main className="container max-w-lg mx-auto px-4 pt-24">
          <Card className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to access this page.
            </p>
          </Card>
        </main>
        <BottomNav />
      </div>
    );
  }

  const TrackReviewCard = ({ track }: { track: PendingTrack }) => {
    const isPlaying = playingTrackId === track.id;
    const isProcessing = processingId === track.id;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-4">
              <button
                onClick={() => handlePlayPause(track)}
                className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-primary" />
                ) : (
                  <Play className="w-6 h-6 text-primary" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground truncate">{track.title}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <User className="w-3 h-3" />
                  <span>@{track.profiles?.username || "unknown"}</span>
                </div>
              </div>

              <Badge 
                variant="secondary" 
                className="capitalize shrink-0"
              >
                {track.status}
              </Badge>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">
                <span className="font-medium">Category:</span> {track.category}
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium">Duration:</span> {formatDuration(track.duration_sec)}
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium">Format:</span> {track.format || "Unknown"}
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium">Size:</span> {formatFileSize(track.file_size_bytes)}
              </div>
            </div>

            {/* Tags */}
            {track.tags && track.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {track.tags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Uploaded date */}
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Uploaded {formatDate(track.created_at)}
            </div>

            {/* Actions - only for pending */}
            {track.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(track.id)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleReject(track.id)}
                  disabled={isProcessing}
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <main className="container max-w-2xl mx-auto px-4 pt-20 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Music Box Admin
          </h1>
          <p className="text-sm text-muted-foreground">
            Review and moderate uploaded sounds
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">{pendingTracks.length}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-green-500">
              {allTracks.filter(t => t.status === "approved").length}
            </div>
            <div className="text-xs text-muted-foreground">Approved</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-red-500">
              {allTracks.filter(t => t.status === "rejected").length}
            </div>
            <div className="text-xs text-muted-foreground">Rejected</div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="pending" className="gap-1">
              <Clock className="w-4 h-4" />
              Pending ({pendingTracks.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-1">
              <FileAudio className="w-4 h-4" />
              All Tracks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3 mt-4">
            {pendingTracks.length === 0 ? (
              <Card className="p-8 text-center">
                <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="text-muted-foreground">No pending tracks to review!</p>
              </Card>
            ) : (
              pendingTracks.map(track => (
                <TrackReviewCard key={track.id} track={track} />
              ))
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-3 mt-4">
            {allTracks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No tracks found
              </div>
            ) : (
              allTracks.map(track => (
                <TrackReviewCard key={track.id} track={track} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}
