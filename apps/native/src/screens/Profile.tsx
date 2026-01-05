
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useMyCounts, useMyProfile, useUserPosts, useUserReels } from '../features/social/profile';

export default function ProfileScreen({ navigation }: { navigation: { navigate: (name: string, params?: any) => void } }){
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useMyProfile(user?.id);
  const { data: counts } = useMyCounts(user?.id);
  const [tab, setTab] = useState<'posts' | 'reels'>('posts');

  const posts = useUserPosts(user?.id ?? '');
  const reels = useUserReels(user?.id ?? '');
  const grid = useMemo(() => {
    if (tab === 'posts') return (posts.data ?? []).map((p: any) => ({ id: p.id, media: p.media_urls?.[0] ?? null, type: 'post' as const }));
    return (reels.data ?? []).map((r: any) => ({ id: r.id, media: r.video_url ?? null, type: 'reel' as const }));
  }, [tab, posts.data, reels.data]);

  const name = profile?.full_name ?? profile?.username ?? 'User';
  const username = profile?.username ? `@${profile.username}` : '';

  return (
    <ScrollView style={{ flex:1, backgroundColor:'#020617' }} contentContainerStyle={{ padding:12, paddingBottom:96 }}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
        <View style={{ height:64, width:64, borderRadius:999, backgroundColor:'rgba(255,255,255,0.08)', alignItems:'center', justifyContent:'center', overflow: 'hidden' }}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={{ width: 64, height: 64 }} />
          ) : (
            <Text style={{ color:'#e6e6e6', fontSize:18 }}>{name[0]?.toUpperCase() ?? 'U'}</Text>
          )}
        </View>
        <View>
          <Text style={{ color:'#fff', fontWeight:'900' }}>
            {name} <Text style={{ color:'#94a3b8', fontWeight:'500' }}>{username}</Text>
          </Text>
          <Text style={{ color:'#9aa4b2', fontSize:12 }}>
            {isLoading ? 'Loading…' : `${(counts?.posts ?? 0)} posts • ${(counts?.reels ?? 0)} reels`}
          </Text>
        </View>
      </View>

      {profile?.bio ? (
        <Text style={{ color:'#9aa4b2', marginTop:10 }}>{profile.bio}</Text>
      ) : null}

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
              if (g.type === 'post') navigation.navigate('PostDetail', { postId: g.id });
              else navigation.navigate('ReelDetail', { reelId: g.id });
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

      <Pressable
        onPress={() => signOut().catch(() => {})}
        style={{ marginTop:12, backgroundColor:'#7f1d1d', paddingVertical:10, borderRadius:12, alignItems:'center' }}
      >
        <Text style={{ color:'#fff', fontWeight:'700' }}>Sign out</Text>
      </Pressable>
    </ScrollView>
  )
}
