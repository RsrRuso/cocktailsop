import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useMyCounts, useUserPosts, useUserReels } from '../features/social/profile';
import { useFollow, useIsFollowing, useUnfollow } from '../features/social/follows';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export default function UserProfileScreen({
  route,
  navigation,
}: {
  route: { params: { userId: string } };
  navigation: { navigate: (name: string, params?: any) => void };
}) {
  const { user } = useAuth();
  const userId = route.params.userId;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const res = await supabase
        .from('profiles')
        .select('id, username, full_name, bio, avatar_url, professional_title, badge_level, follower_count, following_count')
        .eq('id', userId)
        .single();
      if (res.error) throw res.error;
      return res.data as any;
    },
  });

  const counts = useMyCounts(userId);
  const posts = useUserPosts(userId);
  const reels = useUserReels(userId);
  const isMe = !!user?.id && user.id === userId;
  const followState = useIsFollowing({ followerId: user?.id, followingId: userId });
  const follow = useFollow();
  const unfollow = useUnfollow();

  const name = profile?.full_name ?? profile?.username ?? 'User';
  const username = profile?.username ? `@${profile.username}` : '';

  async function toggleFollow() {
    if (!user?.id) return;
    try {
      if (followState.data) {
        await unfollow.mutateAsync({ followerId: user.id, followingId: userId });
      } else {
        await follow.mutateAsync({ followerId: user.id, followingId: userId });
      }
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Unknown error');
    }
  }

  const [tab, setTab] = useState<'posts' | 'reels'>('posts');
  const grid = useMemo(() => {
    if (tab === 'posts') return (posts.data ?? []).map((p: any) => ({ id: p.id, media: p.media_urls?.[0] ?? null, type: 'post' as const }));
    return (reels.data ?? []).map((r: any) => ({ id: r.id, media: r.video_url ?? null, type: 'reel' as const }));
  }, [tab, posts.data, reels.data]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#020617' }} contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>Profile</Text>
      {isLoading ? <Text style={{ color: '#9aa4b2', marginTop: 8 }}>Loading…</Text> : null}

      <View style={{ marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>
          {name} <Text style={{ color: '#94a3b8', fontWeight: '600' }}>{username}</Text>
        </Text>
        {profile?.professional_title ? <Text style={{ color: '#9aa4b2', marginTop: 4 }}>{profile.professional_title}</Text> : null}
        {profile?.bio ? <Text style={{ color: '#9aa4b2', marginTop: 10 }}>{profile.bio}</Text> : null}

        <Text style={{ color: '#64748b', marginTop: 10, fontSize: 12 }}>
          Posts: {counts.data?.posts ?? 0} • Reels: {counts.data?.reels ?? 0}
        </Text>

        {!isMe ? (
          <Pressable
            onPress={() => toggleFollow().catch(() => {})}
            disabled={follow.isPending || unfollow.isPending}
            style={{
              marginTop: 12,
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: 'center',
              backgroundColor: followState.data ? 'rgba(239,68,68,0.18)' : 'rgba(37,99,235,0.18)',
              borderWidth: 1,
              borderColor: followState.data ? 'rgba(239,68,68,0.40)' : 'rgba(37,99,235,0.40)',
              opacity: follow.isPending || unfollow.isPending ? 0.6 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '900' }}>
              {follow.isPending || unfollow.isPending ? 'Working…' : followState.data ? 'Unfollow' : 'Follow'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={() => setTab('posts')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 12,
            alignItems: 'center',
            backgroundColor: tab === 'posts' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '900' }}>Posts</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('reels')}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 12,
            alignItems: 'center',
            backgroundColor: tab === 'reels' ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '900' }}>Reels</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}>
        {grid.map((g) => (
          <Pressable
            key={`${g.type}-${g.id}`}
            style={{ width: '33.33%', padding: 2 }}
            onPress={() => {
              // Keep reels navigation simple for now; post detail is native.
              if (g.type === 'post') {
                navigation.navigate('PostDetail', { postId: g.id });
              } else {
                navigation.navigate('WebRoute', { title: 'Reels', pathTemplate: '/reels' });
              }
            }}
          >
            {g.type === 'post' && g.media ? (
              <Image source={{ uri: g.media }} style={{ width: '100%', aspectRatio: 1 }} />
            ) : (
              <View style={{ width: '100%', aspectRatio: 1, backgroundColor: '#0b0f19', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#9aa4b2' }}>{g.type === 'reel' ? 'Video' : 'No media'}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

