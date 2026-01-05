
import React, { useMemo, useState } from 'react';
import { View, TextInput, ScrollView, Image, Text, Pressable } from 'react-native';
import { useExploreTop } from '../features/social/queries';

export default function ExploreScreen({ navigation }: { navigation: { navigate: (name: string, params?: any) => void } }){
  const [q, setQ] = useState('');
  const { data, isLoading } = useExploreTop();
  const results = useMemo(() => {
    const posts = data?.posts ?? [];
    const query = q.trim().toLowerCase();
    if (!query) return posts;
    return posts.filter((p: any) => String(p.content ?? '').toLowerCase().includes(query));
  }, [q, data]);
  return (
    <ScrollView style={{ flex:1, backgroundColor:'#020617' }} contentContainerStyle={{ padding:12, paddingBottom:96 }}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
        <TextInput placeholder="Search" placeholderTextColor="#64748b" value={q} onChangeText={setQ} style={{ flex:1, paddingHorizontal:12, paddingVertical:10, borderRadius:12, borderWidth:1, borderColor:'rgba(255,255,255,0.2)', color:'#fff' }} />
      </View>
      <View style={{ height:12 }} />
      {isLoading ? <Text style={{ color:'#9aa4b2' }}>Loading…</Text> : null}
      <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
        {results.map((p: any) => (
          <Pressable key={p.id} style={{ width:'33.33%', padding:2 }} onPress={() => navigation.navigate('PostDetail', { postId: p.id })}>
            {p.media_urls?.[0] ? (
              <Image source={{ uri: p.media_urls[0] }} style={{ width:'100%', aspectRatio:1 }} />
            ) : (
              <View style={{ width:'100%', aspectRatio:1, backgroundColor:'#0b0f19', alignItems:'center', justifyContent:'center' }}>
                <Text style={{ color:'#94a3b8' }}>No media</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
