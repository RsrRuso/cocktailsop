
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useApp } from '../state';
import PostCard from '../components/PostCard';

export default function HomeScreen(){
  const { state } = useApp();
  return (
    <ScrollView style={{ flex:1, backgroundColor:'#020617' }} contentContainerStyle={{ padding:12, paddingBottom:96 }}>
      <Header />
      <Stories />
      <View style={{ height:12 }} />
      <View style={{ gap:12 }}>{state.posts.map(p => <PostCard key={p.id} post={p} />)}</View>
    </ScrollView>
  );
}
function Header(){ return (<View style={styles.header}><Text style={styles.logo}>LAB-SOP</Text></View>) }
function Stories(){ const { state } = useApp(); return (<View style={{ flexDirection:'row', gap:12 }}>{state.users.map(u=>(<View key={u.id} style={styles.story}><View style={styles.avatar}><Text style={{color:'#e6e6e6'}}>{u.name[0]}</Text></View><Text style={{color:'#9aa4b2', fontSize:10}}>{u.handle}</Text></View>))}</View>) }
const styles = StyleSheet.create({ header:{ padding:12, backgroundColor:'rgba(0,0,0,.4)', borderColor:'rgba(255,255,255,.1)', borderBottomWidth:1 }, logo:{ color:'#fff', fontWeight:'900' }, story:{ alignItems:'center', gap:6 }, avatar:{ height:56, width:56, borderRadius:999, backgroundColor:'rgba(255,255,255,0.08)', alignItems:'center', justifyContent:'center' } });
