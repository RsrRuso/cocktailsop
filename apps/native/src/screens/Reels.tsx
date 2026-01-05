
import React, { useMemo } from 'react';
import { Pressable, Text, View, Dimensions } from 'react-native';
import { Video } from 'expo-av';
import { FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLikeIds, useToggleReelLike } from '../features/engagement/likes';

const H = Dimensions.get('window').height;

export default function ReelsScreen({ navigation }: { navigation: { navigate: (name: string, params?: any) => void } }){
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['reels'],
    queryFn: async () => {
      const res = await supabase
        .from('reels')
        .select('id, video_url, caption, created_at, user_id, like_count, comment_count, profiles:profiles (id, username)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (res.error) throw res.error;
      return res.data ?? [];
    },
  });
  const videos = data ?? [];

  const likeIds = useLikeIds(user?.id);
  const reelLiked = useMemo(() => new Set(likeIds.data?.reelIds ?? []), [likeIds.data?.reelIds]);
  const toggleLike = useToggleReelLike(user?.id);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <FlatList
        data={videos}
        keyExtractor={(item:any)=>item.id}
        pagingEnabled
        renderItem={({item}:any) => (
          <View style={{ height: H, backgroundColor:'#000', justifyContent:'center' }}>
            {item.video_url ? (
              <Video source={{ uri: item.video_url }} style={{ width:'100%', height:'100%' }} resizeMode="cover" isLooping shouldPlay isMuted />
            ) : (
              <View style={{ width:'100%', height:'100%', alignItems:'center', justifyContent:'center' }}>
                <Text style={{ color:'#9aa4b2' }}>Missing video</Text>
              </View>
            )}
            <View style={{ position:'absolute', bottom:100, left:12, right:12 }}>
              <Text style={{ color:'#fff', fontWeight:'700' }}>{item.caption ?? ''}</Text>
              <Pressable
                onPress={() => navigation.navigate('UserProfile', { userId: item.user_id })}
                style={{ alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>
                  {item.profiles?.username ? `@${item.profiles.username}` : 'Profile'}
                </Text>
              </Pressable>
            </View>

            <View style={{ position:'absolute', right:12, bottom:180, gap:10, alignItems:'center' }}>
              <Pressable
                onPress={() => toggleLike.mutate({ reelId: item.id, isLiked: reelLiked.has(item.id) })}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: reelLiked.has(item.id) ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.10)',
                  borderWidth: 1,
                  borderColor: reelLiked.has(item.id) ? 'rgba(239,68,68,0.40)' : 'rgba(255,255,255,0.18)',
                }}
              >
                <Text style={{ color:'#fff', fontWeight:'900' }}>{reelLiked.has(item.id) ? '♥' : '♡'} {item.like_count ?? 0}</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('ReelDetail', { reelId: item.id })}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.10)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.18)',
                }}
              >
                <Text style={{ color:'#fff', fontWeight:'900' }}>💬 {item.comment_count ?? 0}</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={isLoading ? <Text style={{ color:'#9aa4b2', padding:12 }}>Loading…</Text> : <Text style={{ color:'#9aa4b2', padding:12 }}>No reels yet.</Text>}
      />

      {/* legacy comments modal removed in favor of ReelDetail */}
    </View>
  );
}
