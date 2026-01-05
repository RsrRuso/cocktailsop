
import React from 'react';
import { ScrollView, View, Text, Image, Pressable } from 'react-native';
import { useApp } from '../state';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileScreen(){
  const { state } = useApp();
  const me = state.users.find(u=>u.id===state.meId)!;
  const myPosts = state.posts.filter(p => p.authorId === me.id);
  const { signOut } = useAuth();
  return (
    <ScrollView style={{ flex:1, backgroundColor:'#020617' }} contentContainerStyle={{ padding:12, paddingBottom:96 }}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
        <View style={{ height:64, width:64, borderRadius:999, backgroundColor:'rgba(255,255,255,0.08)', alignItems:'center', justifyContent:'center' }}><Text style={{ color:'#e6e6e6', fontSize:18 }}>{me.name[0]}</Text></View>
        <View>
          <Text style={{ color:'#fff', fontWeight:'700' }}>{me.name} <Text style={{ color:'#94a3b8', fontWeight:'400' }}>{me.handle}</Text></Text>
          <Text style={{ color:'#9aa4b2', fontSize:12 }}>{me.role} • {myPosts.length} posts</Text>
        </View>
      </View>

      <Pressable
        onPress={() => signOut().catch(() => {})}
        style={{ marginTop:12, backgroundColor:'#7f1d1d', paddingVertical:10, borderRadius:12, alignItems:'center' }}
      >
        <Text style={{ color:'#fff', fontWeight:'700' }}>Sign out</Text>
      </Pressable>

      <View style={{ flexDirection:'row', flexWrap:'wrap', marginTop:12 }}>
        {myPosts.map(p => (<View key={p.id} style={{ width:'33.33%', padding:2 }}>{p.media[0]?.type==='image' ? <Image source={{ uri: p.media[0].url }} style={{ width:'100%', aspectRatio:1 }} /> : <View style={{ width:'100%', aspectRatio:1, backgroundColor:'#0b0f19' }} />}</View>))}
      </View>
    </ScrollView>
  )
}
