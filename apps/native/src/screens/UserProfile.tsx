import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useMyCounts } from '../features/social/profile';
import { useFollow, useIsFollowing, useUnfollow } from '../features/social/follows';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export default function UserProfileScreen({ route }: { route: { params: { userId: string } } }) {
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

      <View style={{ marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
        <Text style={{ color: '#fff', fontWeight: '800' }}>Next</Text>
        <Text style={{ color: '#9aa4b2', marginTop: 6 }}>
          Next I’ll add this user’s posts grid + reels list + follow counts, matching the web profile page.
        </Text>
      </View>
    </ScrollView>
  );
}

