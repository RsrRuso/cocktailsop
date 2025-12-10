import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  Music, 
  Upload, 
  TrendingUp, 
  Clock, 
  Flame, 
  User, 
  Play, 
  Pause,
  Search,
  Plus,
  Loader2,
  Volume2,
  Wand2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AdvancedMusicUploadDialog } from "@/components/music-box/AdvancedMusicUploadDialog";

interface MusicTrack {
  id: string;
  title: string;
  uploaded_by: string;
  original_url: string | null;
  preview_url: string | null;
  duration_sec: number | null;
  category: string;
  tags: string[];
  status: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  } | null;
  music_popularity?: {
    usage_count: number;
    usage_score: number;
  } | null;
}

export default function MusicBox() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("trending");
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [myTracks, setMyTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchTracks();
    if (user) {
      fetchMyTracks();
    }
  }, [user]);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("music_tracks")
        .select(`
          *,
          profiles:uploaded_by(username, avatar_url),
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

  const fetchMyTracks = async () => {
    if (!user) {
      console.log("No user, skipping fetchMyTracks");
      return;
    }
    console.log("Fetching my tracks for user:", user.id);
    try {
      const { data, error } = await supabase
        .from("music_tracks")
        .select(`
          *,
          profiles:uploaded_by(username, avatar_url),
          music_popularity(usage_count, usage_score)
        `)
        .eq("uploaded_by", user.id)
        .order("created_at", { ascending: false });

      console.log("My tracks result:", { data, error });
      if (error) throw error;
      setMyTracks(data || []);
    } catch (error) {
      console.error("Error fetching my tracks:", error);
    }
  };

  const handlePlayPause = (track: MusicTrack) => {
    const audioUrl = track.preview_url || track.original_url;
    if (!audioUrl) {
      toast.error("No audio available for this track");
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

  const handleUpload = async (data: { title: string; category: string; tags: string[]; file: File }) => {
    if (!user) {
      toast.error("Please sign in to upload");
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = data.file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("music")
        .upload(`original/${fileName}`, data.file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("music")
        .getPublicUrl(`original/${fileName}`);

      // Create track record
      const { error: insertError } = await supabase
        .from("music_tracks")
        .insert({
          title: data.title,
          uploaded_by: user.id,
          original_url: urlData.publicUrl,
          category: data.category,
          tags: data.tags,
          status: "pending",
          file_size_bytes: data.file.size,
          format: fileExt,
        });

      if (insertError) throw insertError;

      toast.success("Track uploaded! It will be reviewed soon.");
      setShowUploadDialog(false);
      fetchMyTracks();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload track");
      throw error;
    } finally {
      setUploading(false);
    }
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
      case "top":
        return filtered.sort((a, b) => {
          const usesA = a.music_popularity?.usage_count || 0;
          const usesB = b.music_popularity?.usage_count || 0;
          return usesB - usesA;
        });
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

  const TrackCard = ({ track }: { track: MusicTrack }) => {
    const isPlaying = playingTrackId === track.id;
    const usageCount = track.music_popularity?.usage_count || 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all">
          <div className="flex items-center gap-4">
            {/* Play button with waveform animation */}
            <button
              onClick={() => handlePlayPause(track)}
              className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group"
            >
              {isPlaying ? (
                <div className="flex items-end gap-0.5 h-6">
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-primary rounded-full"
                      animate={{ height: ["40%", "100%", "60%", "80%", "40%"] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </div>
              ) : (
                <Play className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
              )}
            </button>

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate">{track.title}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>@{track.profiles?.username || "unknown"}</span>
                <span>•</span>
                <span>{formatDuration(track.duration_sec)}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs capitalize">
                  {track.category}
                </Badge>
                {usageCount > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Volume2 className="w-3 h-3" />
                    {usageCount} uses
                  </span>
                )}
              </div>
            </div>

            {/* Use button */}
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => {
                // Store selected track for editor
                sessionStorage.setItem("selectedMusicTrack", JSON.stringify(track));
                toast.success("Track ready! Go to Create to use it.");
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Use
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending Review</Badge>;
      case "approved":
        return <Badge className="bg-green-500/20 text-green-500">Published</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "processing":
        return <Badge className="bg-blue-500/20 text-blue-500">Processing</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <main className="container max-w-2xl mx-auto px-4 pt-20 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Music className="w-6 h-6 text-primary" />
              Music Box
            </h1>
            <p className="text-sm text-muted-foreground">
              Discover and use trending sounds
            </p>
          </div>
          <Button onClick={() => setShowUploadDialog(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            Upload
          </Button>
        </div>

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
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="trending" className="gap-1">
              <Flame className="w-4 h-4" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="new" className="gap-1">
              <Clock className="w-4 h-4" />
              New
            </TabsTrigger>
            <TabsTrigger value="top" className="gap-1">
              <TrendingUp className="w-4 h-4" />
              Top
            </TabsTrigger>
            <TabsTrigger value="my" className="gap-1">
              <User className="w-4 h-4" />
              My Music
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trending" className="space-y-3 mt-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : getSortedTracks().length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No tracks found
              </div>
            ) : (
              getSortedTracks().map(track => (
                <TrackCard key={track.id} track={track} />
              ))
            )}
          </TabsContent>

          <TabsContent value="new" className="space-y-3 mt-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : getSortedTracks().length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No new tracks
              </div>
            ) : (
              getSortedTracks().map(track => (
                <TrackCard key={track.id} track={track} />
              ))
            )}
          </TabsContent>

          <TabsContent value="top" className="space-y-3 mt-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : getSortedTracks().length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No top tracks yet
              </div>
            ) : (
              getSortedTracks().map(track => (
                <TrackCard key={track.id} track={track} />
              ))
            )}
          </TabsContent>

          <TabsContent value="my" className="space-y-3 mt-4">
            {!user ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Sign in to see your uploads</p>
                <Button onClick={() => navigate("/auth")}>Sign In</Button>
              </div>
            ) : myTracks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Music className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>You haven't uploaded any tracks yet</p>
                <p className="text-xs mt-2">Tip: Upload reels with music - audio is auto-extracted!</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowUploadDialog(true)}
                >
                  Upload Your First Track
                </Button>
              </div>
            ) : (
              <>
                {/* Extracted tracks section */}
                {myTracks.filter(t => t.category === 'extracted').length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Wand2 className="w-4 h-4" />
                      Auto-Extracted from Your Reels
                    </h3>
                    {myTracks.filter(t => t.category === 'extracted').map(track => (
                      <motion.div
                        key={track.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-2"
                      >
                        <Card className="p-4 bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => handlePlayPause(track)}
                              className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"
                            >
                              {playingTrackId === track.id ? (
                                <Pause className="w-5 h-5 text-primary" />
                              ) : (
                                <Play className="w-5 h-5 text-primary" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{track.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                {getStatusBadge(track.status)}
                                <Badge variant="outline" className="text-xs bg-primary/10">
                                  <Wand2 className="w-3 h-3 mr-1" />
                                  Extracted
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Uploaded tracks section */}
                {myTracks.filter(t => t.category !== 'extracted').length > 0 && (
                  <div>
                    {myTracks.filter(t => t.category === 'extracted').length > 0 && (
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Your Uploads
                      </h3>
                    )}
                    {myTracks.filter(t => t.category !== 'extracted').map(track => (
                      <motion.div
                        key={track.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-2"
                      >
                        <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => handlePlayPause(track)}
                              className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"
                            >
                              {playingTrackId === track.id ? (
                                <Pause className="w-5 h-5 text-primary" />
                              ) : (
                                <Play className="w-5 h-5 text-primary" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{track.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                {getStatusBadge(track.status)}
                                <Badge variant="secondary" className="text-xs capitalize">
                                  {track.category}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Advanced Upload Dialog */}
      <AdvancedMusicUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUpload={handleUpload}
        uploading={uploading}
      />

      <BottomNav />
    </div>
  );
}
