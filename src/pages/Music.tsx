import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Trash2, Play } from "lucide-react";
import MusicSelectionDialog from "@/components/MusicSelectionDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MusicShareCommentsDialog } from "@/components/MusicShareCommentsDialog";

interface MusicShare {
  id: string;
  user_id: string;
  track_id: string;
  track_title: string;
  track_artist: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
  like_count: number;
  comment_count: number;
}

const Music = () => {
  const { user } = useAuth();
  const [musicShares, setMusicShares] = useState<MusicShare[]>([]);
  const [likedShares, setLikedShares] = useState<Set<string>>(new Set());
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [showMusicDialog, setShowMusicDialog] = useState(false);
  const [showCommentsDialog, setShowCommentsDialog] = useState(false);
  const [selectedShare, setSelectedShare] = useState<MusicShare | null>(null);
  const [isPlayModalOpen, setIsPlayModalOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchMusicShares();
      fetchLikedShares();
    }

    const musicSharesChannel = supabase
      .channel('music_shares_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_shares' }, fetchMusicShares)
      .subscribe();

    const likesChannel = supabase
      .channel('music_share_likes_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_share_likes' }, fetchLikedShares)
      .subscribe();

    const followsChannel = supabase
      .channel('follows_music_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, fetchMusicShares)
      .subscribe();

    return () => {
      supabase.removeChannel(musicSharesChannel);
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(followsChannel);
    };
  }, [user?.id]);

  const fetchMusicShares = async () => {
    if (!user?.id) return;

    try {
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = followingData?.map(f => f.following_id) || [];
      const userIds = [user.id, ...followingIds];

      const { data: sharesData, error } = await supabase
        .from('music_shares')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (!sharesData || sharesData.length === 0) {
        setMusicShares([]);
        return;
      }

      // Fetch profiles separately
      const userIdsToFetch = [...new Set(sharesData.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIdsToFetch);

      // Map profiles to shares
      const sharesWithProfiles = sharesData.map(share => ({
        ...share,
        profiles: profiles?.find(p => p.id === share.user_id) || { username: 'Unknown', avatar_url: null }
      }));

      setMusicShares(sharesWithProfiles);
    } catch (error) {
      console.error('Error fetching music shares:', error);
    }
  };

  const fetchLikedShares = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('music_share_likes')
        .select('music_share_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setLikedShares(new Set(data?.map(l => l.music_share_id) || []));
    } catch (error) {
      console.error('Error fetching liked shares:', error);
    }
  };

  const handlePlayTrack = (trackId: string) => {
    setPlayingTrackId(trackId);
    setIsPlayModalOpen(true);
  };

  const handleLike = async (shareId: string) => {
    if (!user?.id) {
      toast.error("Please login to like music");
      return;
    }

    const isLiked = likedShares.has(shareId);
    const newLikedShares = new Set(likedShares);
    
    if (isLiked) {
      newLikedShares.delete(shareId);
    } else {
      newLikedShares.add(shareId);
    }
    setLikedShares(newLikedShares);

    // Database trigger handles count update - no manual count changes
    try {
      if (isLiked) {
        const { error } = await supabase
          .from('music_share_likes')
          .delete()
          .eq('music_share_id', shareId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('music_share_likes')
          .insert({ music_share_id: shareId, user_id: user.id });
        // Ignore duplicate key errors - already liked
        if (error && error.code !== '23505') throw error;
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
      // Revert on error
      setLikedShares(likedShares);
    }
  };

  const handleComment = (share: MusicShare) => {
    setSelectedShare(share);
    setShowCommentsDialog(true);
  };

  const handleDeleteShare = async (shareId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('music_shares')
        .delete()
        .eq('id', shareId)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success("Music share deleted");
      fetchMusicShares();
    } catch (error) {
      console.error('Error deleting share:', error);
      toast.error("Failed to delete share");
    }
  };

  return (
    <div className="min-h-screen pb-20 pt-16">
      <TopNav />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Music Shares</h1>
          <Button onClick={() => setShowMusicDialog(true)}>
            Share Music
          </Button>
        </div>

        {musicShares.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No music shared yet</p>
            <Button onClick={() => setShowMusicDialog(true)}>
              Share Your First Track
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {musicShares.map((share) => (
              <div key={share.id} className="glass rounded-lg p-4">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={share.profiles.avatar_url || undefined} />
                    <AvatarFallback>{share.profiles.username[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{share.profiles.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(share.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {share.user_id === user?.id && (
                    <button
                      onClick={() => handleDeleteShare(share.id)}
                      className="text-destructive hover:opacity-70"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1">
                    <p className="font-semibold">{share.track_title}</p>
                    <p className="text-sm text-muted-foreground">{share.track_artist}</p>
                  </div>
                  <button
                    onClick={() => handlePlayTrack(share.track_id)}
                    className="p-2 rounded-full bg-primary text-primary-foreground hover:opacity-90"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <button
                    onClick={() => handleLike(share.id)}
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    <Heart
                      className={`w-5 h-5 ${likedShares.has(share.id) ? 'fill-primary text-primary' : ''}`}
                    />
                    <span>{share.like_count}</span>
                  </button>
                  <button
                    onClick={() => handleComment(share)}
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{share.comment_count}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />

      <Dialog open={isPlayModalOpen} onOpenChange={setIsPlayModalOpen}>
        <DialogContent className="max-w-md">
          {playingTrackId && (
            <iframe
              src={`https://open.spotify.com/embed/track/${playingTrackId}`}
              width="100%"
              height="380"
              frameBorder="0"
              allow="encrypted-media"
              title="Spotify Player"
            />
          )}
        </DialogContent>
      </Dialog>

      <MusicSelectionDialog
        open={showMusicDialog}
        onOpenChange={(open) => {
          setShowMusicDialog(open);
          if (!open) fetchMusicShares();
        }}
      />

      {selectedShare && (
        <MusicShareCommentsDialog
          open={showCommentsDialog}
          onOpenChange={setShowCommentsDialog}
          musicShareId={selectedShare.id}
          trackTitle={selectedShare.track_title}
          trackArtist={selectedShare.track_artist}
        />
      )}
    </div>
  );
};

export default Music;
