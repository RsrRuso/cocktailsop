import { queryClient } from './queryClient';
import { supabase } from '@/integrations/supabase/client';
import { deduplicateRequest } from './requestDeduplication';

// Prefetch story data for user
export const prefetchStories = async (userId: string) => {
  await queryClient.prefetchQuery({
    queryKey: ['stories', userId],
    queryFn: () => deduplicateRequest(`stories-${userId}`, async () => {
      const { data } = await supabase
        .from('stories')
        .select(`
          *,
          profiles (username, avatar_url)
        `)
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });
      
      // Preload first story media for instant display
      if (data && data[0]) {
        const firstStory = data[0];
        firstStory.media_urls?.forEach((url: string, index: number) => {
          const mediaType = firstStory.media_types?.[index];
          if (!mediaType || mediaType.startsWith('image')) {
            const img = new Image();
            img.src = url;
          }
        });
      }
      
      return data || [];
    }),
    staleTime: 5 * 60 * 1000,
  });
};

// Prefetch profile data before navigation
export const prefetchProfile = async (userId: string) => {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['profile', userId],
      queryFn: () => deduplicateRequest(`profile-${userId}`, async () => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        return data;
      }),
      staleTime: 2 * 60 * 1000,
    }),
    queryClient.prefetchQuery({
      queryKey: ['posts', userId],
      queryFn: () => deduplicateRequest(`posts-${userId}`, async () => {
        const { data } = await supabase
          .from('posts')
          .select('id, content, media_urls, like_count, comment_count, view_count, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(12);
        return data || [];
      }),
      staleTime: 2 * 60 * 1000,
    }),
  ]);
};

// Prefetch home feed - prewarms the feed cache
export const prefetchHomeFeed = async (region: string | null) => {
  // Also prewarm the useFeedData cache by fetching directly
  try {
    const [postsRes, reelsRes] = await Promise.all([
      supabase
        .from('posts')
        .select('id, user_id, content, media_urls, like_count, comment_count, view_count, repost_count, save_count, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('reels')
        .select('id, user_id, video_url, caption, like_count, comment_count, view_count, repost_count, save_count, created_at, music_url, music_track_id, mute_original_audio')
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    if (postsRes.data && reelsRes.data) {
      // Get unique user IDs
      const userIds = [...new Set([...postsRes.data.map(p => p.user_id), ...reelsRes.data.map(r => r.user_id)])];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, professional_title, badge_level, region')
        .in('id', userIds);

      // Warm the module-level cache that useFeedData uses
      const postsWithProfiles = postsRes.data.map(post => ({
        ...post,
        profiles: profiles?.find(p => p.id === post.user_id) || null
      }));
      
      const reelsWithProfiles = reelsRes.data.map(reel => ({
        ...reel,
        profiles: profiles?.find(p => p.id === reel.user_id) || null
      }));

      // Store in window for useFeedData to pick up
      (window as any).__feedPrefetch = {
        posts: postsWithProfiles,
        reels: reelsWithProfiles,
        timestamp: Date.now(),
        region
      };
    }
  } catch (e) {
    console.error('Feed prefetch failed');
  }
};

// Prefetch emails for instant loading
export const prefetchEmails = async (userId: string) => {
  try {
    const { data } = await supabase
      .from('internal_emails')
      .select('*')
      .eq('recipient_id', userId)
      .eq('archived', false)
      .eq('is_draft', false)
      .order('created_at', { ascending: false })
      .limit(25);

    if (data?.length) {
      // Get profiles for senders
      const senderIds = [...new Set(data.map(e => e.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const enriched = data.map(e => ({
        ...e,
        sender_name: profileMap.get(e.sender_id)?.full_name || 'Unknown',
        recipient_name: 'You',
      }));

      // Store in sessionStorage for instant access
      try {
        sessionStorage.setItem('em_inbox', JSON.stringify(enriched));
        sessionStorage.setItem('em_uid', JSON.stringify(userId));
      } catch {}
    }
  } catch (e) {
    console.error('Email prefetch failed');
  }
};

// Prefetch messages for instant loading
export const prefetchMessages = async (userId: string) => {
  try {
    const { data: convData } = await supabase
      .from('conversations')
      .select('id, participant_ids, last_message_at, is_group, group_name, group_avatar_url')
      .contains('participant_ids', [userId])
      .order('last_message_at', { ascending: false })
      .limit(30);

    if (convData?.length) {
      const otherUserIds = convData
        .filter(conv => !conv.is_group)
        .map(conv => conv.participant_ids.find((id: string) => id !== userId))
        .filter(Boolean) as string[];

      const { data: profiles } = otherUserIds.length > 0
        ? await supabase.from('profiles').select('id, username, avatar_url, full_name').in('id', otherUserIds)
        : { data: [] };

      const profilesMap = new Map<string, any>();
      profiles?.forEach(p => profilesMap.set(p.id, p));
      const pinnedChats = new Set<string>(JSON.parse(localStorage.getItem('pinnedChats') || '[]'));
      const archivedChats = new Set<string>(JSON.parse(localStorage.getItem('archivedChats') || '[]'));

      const conversations = convData.map(conv => ({
        id: conv.id,
        participant_ids: conv.participant_ids,
        last_message_at: conv.last_message_at,
        is_group: conv.is_group,
        group_name: conv.group_name,
        group_avatar_url: conv.group_avatar_url,
        otherUser: conv.is_group ? undefined : profilesMap.get(conv.participant_ids.find((id: string) => id !== userId)),
        unreadCount: 0,
        lastMessage: '',
        isPinned: pinnedChats.has(conv.id),
        isArchived: archivedChats.has(conv.id),
      }));

      // Store in sessionStorage for instant access
      try {
        const cache = { data: conversations, timestamp: Date.now(), userId };
        sessionStorage.setItem('msg_cache', JSON.stringify(cache));
      } catch {}
    }
  } catch (e) {
    console.error('Messages prefetch failed');
  }
};

// Prefetch all critical routes for instant navigation
export const prefetchAllCritical = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Prefetch in parallel
    await Promise.all([
      prefetchEmails(user.id),
      prefetchMessages(user.id),
      prefetchHomeFeed(null),
    ]);
    
    console.log('⚡ Critical routes prefetched');
  } catch (e) {
    console.error('Critical prefetch failed');
  }
};
