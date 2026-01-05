
import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { Video } from 'expo-av';
import { FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const H = Dimensions.get('window').height;

export default function ReelsScreen(){
  const { data, isLoading } = useQuery({
    queryKey: ['reels'],
    queryFn: async () => {
      const res = await supabase
        .from('reels')
        .select('id, video_url, caption, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(50);
      if (res.error) throw res.error;
      return res.data ?? [];
    },
  });
  const videos = data ?? [];
  return (
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
          </View>
        </View>
      )}
      ListEmptyComponent={isLoading ? <Text style={{ color:'#9aa4b2', padding:12 }}>Loading…</Text> : <Text style={{ color:'#9aa4b2', padding:12 }}>No reels yet.</Text>}
    />
  )
}
