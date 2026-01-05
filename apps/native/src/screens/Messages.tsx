
import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useConversations } from '../features/messaging/queries';

export default function MessagesScreen({ navigation }: { navigation: { navigate: (name: string, params?: any) => void } }){
  const { user } = useAuth();
  const { data, isLoading } = useConversations(user?.id);
  return (
    <ScrollView style={{ flex:1, backgroundColor:'#020617' }} contentContainerStyle={{ padding:12, paddingBottom:96, gap:8 }}>
      {isLoading ? <Text style={{ color:'#9aa4b2' }}>Loading…</Text> : null}
      {(data ?? []).map((c) => {
        const name = c.other?.full_name || c.other?.username || 'Conversation';
        const initials = (String(name).trim()[0] || 'C').toUpperCase();
        return (
          <Pressable
            key={c.id}
            onPress={() => navigation.navigate('WebRoute', { title: 'Messages', pathTemplate: `/messages/${c.id}` })}
            style={{ padding:12, borderRadius:12, backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1, borderColor:'rgba(255,255,255,0.12)', flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}
          >
            <View style={{ flexDirection:'row', gap:8, alignItems:'center', flex: 1 }}>
              <View style={{ height:32, width:32, borderRadius:12, backgroundColor:'rgba(255,255,255,0.08)', alignItems:'center', justifyContent:'center' }}>
                <Text style={{ color:'#e6e6e6' }}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color:'#fff', fontWeight:'600' }} numberOfLines={1}>{name}</Text>
                <Text style={{ color:'#9aa4b2', fontSize:12 }} numberOfLines={1}>{c.last?.content ?? 'Open thread'}</Text>
              </View>
            </View>
            <View style={{ paddingHorizontal:10, paddingVertical:6, borderRadius:10, borderWidth:1, borderColor:'rgba(255,255,255,0.18)', backgroundColor:'rgba(255,255,255,0.08)' }}>
              <Text style={{ color:'#e6e6e6' }}>Open</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  )
}
