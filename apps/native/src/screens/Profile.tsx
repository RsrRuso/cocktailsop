
import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useMyCounts, useMyProfile } from '../features/social/profile';

export default function ProfileScreen(){
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useMyProfile(user?.id);
  const { data: counts } = useMyCounts(user?.id);

  const name = profile?.full_name ?? profile?.username ?? 'User';
  const username = profile?.username ? `@${profile.username}` : '';

  return (
    <ScrollView style={{ flex:1, backgroundColor:'#020617' }} contentContainerStyle={{ padding:12, paddingBottom:96 }}>
      <View style={{ flexDirection:'row', alignItems:'center', gap:12 }}>
        <View style={{ height:64, width:64, borderRadius:999, backgroundColor:'rgba(255,255,255,0.08)', alignItems:'center', justifyContent:'center' }}>
          <Text style={{ color:'#e6e6e6', fontSize:18 }}>{name[0]?.toUpperCase() ?? 'U'}</Text>
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

      <Pressable
        onPress={() => signOut().catch(() => {})}
        style={{ marginTop:12, backgroundColor:'#7f1d1d', paddingVertical:10, borderRadius:12, alignItems:'center' }}
      >
        <Text style={{ color:'#fff', fontWeight:'700' }}>Sign out</Text>
      </Pressable>

      <View style={{ marginTop: 12, padding: 12, borderRadius: 12, backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1, borderColor:'rgba(255,255,255,0.12)' }}>
        <Text style={{ color:'#fff', fontWeight:'800' }}>Next</Text>
        <Text style={{ color:'#9aa4b2', marginTop: 6 }}>
          This screen will next show your posts grid + saved posts + reels, matching the web app profile tabs.
        </Text>
      </View>
    </ScrollView>
  )
}
