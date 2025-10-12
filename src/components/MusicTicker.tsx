import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import OptimizedAvatar from "./OptimizedAvatar";
import { Music, X } from "lucide-react";
import { Dialog, DialogContent } from "./ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface MusicShare {
  id: string;
  user_id: string;
  track_id: string;
  track_title: string;
  track_artist: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
  track?: {
    track_id: string;
    preview_url: string | null;
  };
}

const MusicTicker = () => {
  const { user } = useAuth();
  const [musicShares, setMusicShares] = useState<MusicShare[]>([]);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  useEffect(() => {
    fetchMusicShares();

    const channel = supabase
      .channel("music_shares_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "music_shares",
        },
        () => {
          fetchMusicShares();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchMusicShares = async () => {
    if (!user) return;

    // Get users that current user follows
    const { data: followingData } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    const followingIds = followingData?.map(f => f.following_id) || [];
    const allowedUserIds = [...followingIds, user.id]; // Include current user's shares

    if (allowedUserIds.length === 0) {
      setMusicShares([]);
      return;
    }

    // Fetch music shares from followed users and current user
    const { data, error } = await supabase
      .from("music_shares")
      .select("*")
      .in("user_id", allowedUserIds)
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("Error fetching music shares:", error);
      return;
    }

    // Fetch related profiles and tracks separately
    const userIds = [...new Set(data.map(share => share.user_id))];
    const trackIds = [...new Set(data.map(share => share.track_id))];

    const [{ data: profiles }, { data: tracks }] = await Promise.all([
      supabase.from('profiles').select('id, username, avatar_url').in('id', userIds),
      supabase.from('popular_music').select('track_id, preview_url').in('track_id', trackIds)
    ]);

    // Map profiles and tracks to shares
    const sharesWithDetails = data.map(share => ({
      ...share,
      profile: profiles?.find(p => p.id === share.user_id),
      track: tracks?.find(t => t.track_id === share.track_id)
    }));

    setMusicShares(sharesWithDetails as any);
  };

  const handlePlayTrack = (trackId: string) => {
    console.log('Opening Spotify player for track:', trackId);
    setPlayingTrackId(trackId);
  };

  const handleDeleteShare = async (shareId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { error } = await supabase
      .from('music_shares')
      .delete()
      .eq('id', shareId);

    if (error) {
      console.error('Error deleting music share:', error);
      toast.error("Failed to delete music share");
      return;
    }

    toast.success("Music share deleted");
    fetchMusicShares();
  };

  if (musicShares.length === 0) {
    return (
      <div className="w-full py-4 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 backdrop-blur-sm border-y border-border/50">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">🎵 No music shared yet - be the first to share!</p>
        </div>
      </div>
    );
  }

  return (
    <>
      
      <div className="w-full overflow-x-auto py-2 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 backdrop-blur-sm border-y border-border/50 relative scrollbar-hide">
        <div className="flex gap-4 px-4 animate-scroll-left" style={{ width: 'max-content' }}>
          {[...musicShares, ...musicShares, ...musicShares].map((share, index) => {
            return (
              <div
                key={`${share.id}-${index}`}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-card to-card/50 rounded-lg border border-primary/20 shadow-lg shrink-0 min-w-[280px] max-w-[280px] hover:scale-105 hover:shadow-xl hover:border-primary/40 transition-all cursor-pointer group relative"
                onClick={() => handlePlayTrack(share.track_id)}
              >
                {user?.id === share.user_id && (
                  <button
                    onClick={(e) => handleDeleteShare(share.id, e)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 z-10"
                    title="Delete"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                )}
                {share.track?.preview_url ? (
                  <div className="relative shrink-0">
                    <img 
                      src={share.track.preview_url} 
                      alt={share.track_title}
                      className="w-10 h-10 object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/20 rounded-lg group-hover:bg-black/0 transition-all" />
                  </div>
                ) : (
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
                      <Music className="w-5 h-5 text-purple-400" />
                    </div>
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mb-0.5">
                    <OptimizedAvatar
                      src={share.profile?.avatar_url}
                      alt={share.profile?.username || 'User'}
                      className="w-3 h-3 inline-block ring-1 ring-primary/20"
                    />
                    <span className="font-medium">@{share.profile?.username || 'Unknown'}</span>
                  </p>
                  <p className="font-bold text-xs truncate text-foreground">{share.track_title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{share.track_artist}</p>
                </div>

                <div className="shrink-0 bg-green-500/10 p-1.5 rounded-lg group-hover:bg-green-500/20 transition-colors">
                  <Music className="w-4 h-4 text-green-500" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!playingTrackId} onOpenChange={() => setPlayingTrackId(null)}>
        <DialogContent className="max-w-sm p-2 glass border-primary/20 bg-background/40 backdrop-blur-xl">
          {playingTrackId && (
            <div className="rounded-lg overflow-hidden">
              <iframe
                style={{ borderRadius: '12px' }}
                src={`https://open.spotify.com/embed/track/${playingTrackId}?utm_source=generator&theme=0`}
                width="100%"
                height="152"
                frameBorder="0"
                allowFullScreen
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MusicTicker;
