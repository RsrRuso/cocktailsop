import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, UserMinus, Image, Video, Music, MessageSquare, Loader2, Calendar } from 'lucide-react';

export const NotificationTestPanel = () => {
  const [loading, setLoading] = useState<string | null>(null);

  const createTestPost = async () => {
    setLoading('post');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: '🧪 Test post to trigger follower notifications!',
        });

      if (error) throw error;
      toast.success('Test post created! Followers will get notified.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(null);
    }
  };

  const createTestReel = async () => {
    setLoading('reel');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('reels')
        .insert({
          user_id: user.id,
          video_url: 'https://example.com/test-video.mp4',
          caption: '🧪 Test reel to trigger follower notifications!',
        });

      if (error) throw error;
      toast.success('Test reel created! Followers will get notified.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(null);
    }
  };

  const createTestMusicShare = async () => {
    setLoading('music');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('music_shares')
        .insert({
          user_id: user.id,
          track_id: 'test_' + Date.now(),
          track_title: '🎵 Test Track',
          track_artist: 'Test Artist',
        });

      if (error) throw error;
      toast.success('Test music shared! Followers will get notified.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(null);
    }
  };

  const createTestStory = async () => {
    setLoading('story');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_urls: ['https://example.com/test-image.jpg'],
          media_types: ['image'],
        });

      if (error) throw error;
      toast.success('Test story created! Followers will get notified.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(null);
    }
  };

  const createTestEvent = async () => {
    setLoading('event');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('events')
        .insert({
          user_id: user.id,
          title: '🧪 Test Event - Notification Demo',
          description: 'This is a test event to trigger follower notifications!',
          region: 'All',
          event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'upcoming',
        });

      if (error) throw error;
      toast.success('Test event created! Followers will get notified.');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="glass p-6 space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">🧪 Real-Time Notification Tests</h3>
        <p className="text-sm text-muted-foreground">
          These tests create actual database entries that trigger real notifications to your followers!
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          onClick={createTestPost}
          disabled={!!loading}
          variant="outline"
          className="glass-hover justify-start gap-2"
        >
          {loading === 'post' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Image className="w-4 h-4 text-blue-400" />
          )}
          Create Test Post
        </Button>

        <Button
          onClick={createTestReel}
          disabled={!!loading}
          variant="outline"
          className="glass-hover justify-start gap-2"
        >
          {loading === 'reel' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Video className="w-4 h-4 text-pink-500" />
          )}
          Create Test Reel
        </Button>

        <Button
          onClick={createTestMusicShare}
          disabled={!!loading}
          variant="outline"
          className="glass-hover justify-start gap-2"
        >
          {loading === 'music' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Music className="w-4 h-4 text-green-400" />
          )}
          Share Test Music
        </Button>

        <Button
          onClick={createTestStory}
          disabled={!!loading}
          variant="outline"
          className="glass-hover justify-start gap-2"
        >
          {loading === 'story' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MessageSquare className="w-4 h-4 text-yellow-500" />
          )}
          Create Test Story
        </Button>

        <Button
          onClick={createTestEvent}
          disabled={!!loading}
          variant="outline"
          className="glass-hover justify-start gap-2"
        >
          {loading === 'event' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Calendar className="w-4 h-4 text-purple-500" />
          )}
          Create Test Event
        </Button>
      </div>

      <div className="pt-4 border-t border-primary/20">
        <h4 className="text-sm font-medium mb-2">✅ Features Active:</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li className="flex items-center gap-2">
            <UserPlus className="w-3 h-3 text-green-500" />
            Follow notifications
          </li>
          <li className="flex items-center gap-2">
            <UserMinus className="w-3 h-3 text-orange-500" />
            Unfollow notifications
          </li>
          <li className="flex items-center gap-2">
            <Image className="w-3 h-3 text-blue-400" />
            New post notifications to followers
          </li>
          <li className="flex items-center gap-2">
            <Video className="w-3 h-3 text-pink-500" />
            New reel notifications to followers
          </li>
          <li className="flex items-center gap-2">
            <Music className="w-3 h-3 text-green-400" />
            New music notifications to followers
          </li>
          <li className="flex items-center gap-2">
            <MessageSquare className="w-3 h-3 text-yellow-500" />
            New story notifications to followers
          </li>
          <li className="flex items-center gap-2">
            <Calendar className="w-3 h-3 text-purple-500" />
            New event notifications to followers
          </li>
        </ul>
      </div>
    </Card>
  );
};
