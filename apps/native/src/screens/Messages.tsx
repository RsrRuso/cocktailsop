
import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useApp } from '../state';

export default function MessagesScreen(){
  const { state } = useApp();
  return (
    <ScrollView style={{ flex:1, backgroundColor:'#020617' }} contentContainerStyle={{ padding:12, paddingBottom:96, gap:8 }}>
      {state.messages.map(m => {
        const u = state.users.find(x=>x.id===m.withId)!;
        return (
          <View key={m.id} style={{ padding:12, borderRadius:12, backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1, borderColor:'rgba(255,255,255,0.12)', flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
            <View style={{ flexDirection:'row', gap:8, alignItems:'center' }}>
              <View style={{ height:32, width:32, borderRadius:12, backgroundColor:'rgba(255,255,255,0.08)', alignItems:'center', justifyContent:'center' }}><Text style={{ color:'#e6e6e6' }}>{u.name[0]}</Text></View>
              <View><Text style={{ color:'#fff', fontWeight:'600' }}>{u.name}</Text><Text style={{ color:'#9aa4b2', fontSize:12 }}>{m.last}</Text></View>
            </View>
            <View style={{ paddingHorizontal:10, paddingVertical:6, borderRadius:10, borderWidth:1, borderColor:'rgba(255,255,255,0.18)', backgroundColor:'rgba(255,255,255,0.08)' }}><Text style={{ color:'#e6e6e6' }}>Open</Text></View>
          </View>
        )
      })}
    </ScrollView>
  )
}
