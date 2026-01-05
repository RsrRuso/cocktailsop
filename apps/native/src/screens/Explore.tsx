
import React, { useMemo, useState } from 'react';
import { View, TextInput, ScrollView, Image, Text } from 'react-native';
import { useApp } from '../state';

export default function ExploreScreen(){
  const { state } = useApp();
  const [q, setQ] = useState('');
  const results = useMemo(()=> state.posts.filter(p => (p.caption+' '+(p.tags||[]).join(' ')).toLowerCase().includes(q.toLowerCase())), [q, state.posts]);
  return (
    <ScrollView style={{ flex:1, backgroundColor:'#020617' }} contentContainerStyle={{ padding:12, paddingBottom:96 }}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
        <TextInput placeholder="Search" placeholderTextColor="#64748b" value={q} onChangeText={setQ} style={{ flex:1, paddingHorizontal:12, paddingVertical:10, borderRadius:12, borderWidth:1, borderColor:'rgba(255,255,255,0.2)', color:'#fff' }} />
      </View>
      <View style={{ height:12 }} />
      <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
        {results.map(p => (<View key={p.id} style={{ width:'33.33%', padding:2 }}>{p.media[0]?.type==='image' ? <Image source={{ uri: p.media[0].url }} style={{ width:'100%', aspectRatio:1 }} /> : <View style={{ width:'100%', aspectRatio:1, backgroundColor:'#0b0f19', alignItems:'center', justifyContent:'center' }}><Text style={{ color:'#94a3b8' }}>Video</Text></View>}</View>))}
      </View>
    </ScrollView>
  );
}
