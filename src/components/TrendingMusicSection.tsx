import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Play, Pause, RefreshCw, Loader2, Sparkles } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";
import { toast } from "sonner";
import { ScrollArea } from "./ui/scroll-area";

interface TrendingTrack {
  id: string;
  track_id: string;
  title: string;
  artist: string;
  album: string | null;
  genre: string | null;
  mood: string | null;
  preview_url: string | null;
  spotify_url: string | null;
  cover_image_url: string | null;
  popularity_score: number | null;
  duration_seconds: number | null;
  is_featured: boolean | null;
  usage_count: number | null;
}

const TrendingMusicSection = () => {
  const [trendingTracks, setTrendingTracks] = useState<TrendingTrack[]>([]);
  const [featuredTracks, setFeaturedTracks] = useState<TrendingTrack[]>([]);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'featured' | 'trending' | 'all'>('featured');

  useEffect(() => {
    fetchTrendingMusic();
  }, []);

  const fetchTrendingMusic = async () => {
    try {
      // Fetch featured tracks
      const { data: featured } = await supabase
        .from('platform_music_library')
        .select('*')
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('popularity_score', { ascending: false })
        .limit(20);

      // Fetch all trending
      const { data: trending } = await supabase
        .from('platform_music_library')
        .select('*')
        .eq('is_active', true)
        .order('popularity_score', { ascending: false })
        .limit(100);

      setFeaturedTracks(featured || []);
      setTrendingTracks(trending || []);
    } catch (error) {
      console.error('Error fetching trending music:', error);
    }
  };

  const handleSyncLibrary = async () => {
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('populate-music-library', {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {}
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message || 'Music library updated!');
        fetchTrendingMusic();
      } else {
        toast.error(data?.error || 'Failed to sync library');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Failed to sync music library');
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTracks = activeTab === 'featured' ? featuredTracks : trendingTracks;

  return (
    <>
      <div className="space-y-4">
        {/* Header with sync button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Music Library</h2>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSyncLibrary}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing...</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" />Sync Spotify</>
            )}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(['featured', 'trending', 'all'] as const).map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab)}
              className="capitalize"
            >
              {tab === 'featured' && <Sparkles className="w-3 h-3 mr-1" />}
              {tab}
            </Button>
          ))}
        </div>

        {/* Empty state */}
        {currentTracks.length === 0 && (
          <div className="text-center py-12 glass rounded-xl">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">No music in library yet</p>
            <p className="text-xs text-muted-foreground mb-6">
              Sync with Spotify to load trending tracks
            </p>
            <Button onClick={handleSyncLibrary} disabled={isSyncing}>
              {isSyncing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading...</>
              ) : (
                <><RefreshCw className="w-4 h-4 mr-2" />Load Trending Music</>
              )}
            </Button>
          </div>
        )}

        {/* Featured horizontal scroll */}
        {activeTab === 'featured' && featuredTracks.length > 0 && (
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-4">
              {featuredTracks.slice(0, 10).map((track) => (
                <div 
                  key={track.id} 
                  className="flex-shrink-0 w-36 group cursor-pointer"
                  onClick={() => setPlayingTrackId(track.track_id)}
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden mb-2">
                    {track.cover_image_url ? (
                      <img 
                        src={track.cover_image_url} 
                        alt={track.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                        <TrendingUp className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                        <Play className="w-5 h-5 text-primary-foreground fill-current" />
                      </div>
                    </div>
                    {track.is_featured && (
                      <Badge className="absolute top-2 left-2 text-xs" variant="default">
                        <Sparkles className="w-3 h-3 mr-1" />Featured
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium text-sm truncate">{track.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Track list */}
        <div className="space-y-2">
          {currentTracks.map((track, index) => (
            <Card 
              key={track.id} 
              className="glass p-3 hover:bg-accent/10 transition-all cursor-pointer group"
              onClick={() => setPlayingTrackId(track.track_id)}
            >
              <div className="flex items-center gap-3">
                {/* Rank/Cover */}
                <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  {track.cover_image_url ? (
                    <img 
                      src={track.cover_image_url} 
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                      <span className="font-bold text-lg">{index + 1}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-4 h-4 text-white fill-current" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{track.title}</p>
                    {track.popularity_score && track.popularity_score > 80 && (
                      <span className="text-xs">🔥</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {track.genre && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{track.genre}</Badge>
                    )}
                    {track.mood && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{track.mood}</Badge>
                    )}
                  </div>
                </div>

                {/* Duration & play count */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground">{formatDuration(track.duration_seconds)}</p>
                  {track.usage_count && track.usage_count > 0 && (
                    <p className="text-[10px] text-muted-foreground">{track.usage_count} uses</p>
                  )}
                </div>

                {/* Play button */}
                <button
                  className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary hover:text-primary-foreground transition-colors flex items-center justify-center flex-shrink-0"
                >
                  <Play className="w-4 h-4 fill-current" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Audio player dialog */}
      <Dialog open={!!playingTrackId} onOpenChange={() => setPlayingTrackId(null)}>
        <DialogContent className="max-w-md p-4">
          {playingTrackId && (() => {
            const track = [...featuredTracks, ...trendingTracks].find(t => t.track_id === playingTrackId);
            if (!track) return null;
            
            return (
              <div className="space-y-4">
                {/* Cover art */}
                <div className="aspect-square w-full max-w-[280px] mx-auto rounded-xl overflow-hidden">
                  {track.cover_image_url ? (
                    <img 
                      src={track.cover_image_url} 
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                      <TrendingUp className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                {/* Track info */}
                <div className="text-center">
                  <h3 className="font-bold text-lg">{track.title}</h3>
                  <p className="text-muted-foreground">{track.artist}</p>
                  {track.album && <p className="text-xs text-muted-foreground">{track.album}</p>}
                </div>
                
                {/* Tags */}
                <div className="flex items-center justify-center gap-2">
                  {track.genre && <Badge variant="outline">{track.genre}</Badge>}
                  {track.mood && <Badge variant="secondary">{track.mood}</Badge>}
                </div>
                
                {/* Audio player */}
                {track.preview_url ? (
                  <audio 
                    controls 
                    autoPlay 
                    className="w-full"
                    src={track.preview_url}
                  >
                    Your browser does not support audio playback.
                  </audio>
                ) : (
                  <p className="text-center text-muted-foreground text-sm">
                    No preview available for this track
                  </p>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrendingMusicSection;
