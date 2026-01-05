
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Video } from 'expo-av';
import { Post } from '../types';
import { useApp } from '../state';

export default function PostCard({ post }:{ post: Post }){
  const { state, setState } = useApp();
  const author = state.users.find(u => u.id === post.authorId)!;
  const isImage = post.media[0]?.type === 'image';
  const isVideo = post.media[0]?.type === 'video';

  const toggleLike = () => {
    setState(s => ({ ...s, posts: s.posts.map(p => p.id===post.id ? { ...p, likes: (p._liked? p.likes-1 : p.likes+1), _liked: !p._liked } : p) }));
  };

  const addComment = () => {
    setState(s => ({ ...s, posts: s.posts.map(p => p.id===post.id ? { ...p, comments: [...p.comments, { id: 'c-'+Math.random().toString(36).slice(2), authorId: s.meId, text: '🔥', createdAt: new Date().toISOString() }] } : p) }));
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
          <View style={styles.avatar}><Text style={{color:'#e6e6e6'}}>{author.name[0]}</Text></View>
          <View>
            <Text style={styles.author}>{author.name}</Text>
            <Text style={styles.meta}>{author.role} • {new Date(post.createdAt).toLocaleString()}</Text>
          </View>
        </View>
        <View style={styles.pill}><Text style={styles.pillText}>Follow</Text></View>
      </View>

      <View style={{ backgroundColor:'#000' }}>
        {isImage && <Image source={{ uri: post.media[0].url }} style={{ width:'100%', aspectRatio:1 }} resizeMode="cover" />}
        {isVideo && <Video source={{ uri: post.media[0].url }} style={{ width:'100%', aspectRatio:1 }} resizeMode="cover" isMuted shouldPlay isLooping />}
        {!isImage && !isVideo && <View style={{ width:'100%', aspectRatio:1, backgroundColor:'#111' }} />}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={toggleLike}><Text>♥ {post.likes}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={addComment}><Text>💬 {post.comments.length}</Text></TouchableOpacity>
        <View style={styles.btn}><Text>↗ Share</Text></View>
      </View>

      <View style={{ paddingHorizontal:12, paddingBottom:12 }}>
        <Text><Text style={{fontWeight:'700'}}>{author.handle} </Text>{post.caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius:16, overflow:'hidden', backgroundColor:'rgba(255,255,255,0.06)', borderWidth:1, borderColor:'rgba(255,255,255,0.12)' },
  header: { paddingHorizontal:12, paddingVertical:8, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  avatar: { height:32, width:32, borderRadius:12, backgroundColor:'rgba(255,255,255,0.08)', alignItems:'center', justifyContent:'center' },
  author: { color:'#fff', fontWeight:'600' },
  meta: { color:'#9aa4b2', fontSize:12 },
  pill: { paddingHorizontal:8, paddingVertical:4, borderRadius:10, borderWidth:1, borderColor:'rgba(255,255,255,0.18)', backgroundColor:'rgba(255,255,255,0.08)' },
  pillText: { color:'#e6e6e6', fontSize:10 },
  actions: { flexDirection:'row', gap:8, paddingHorizontal:12, paddingVertical:8 },
  btn: { paddingHorizontal:10, paddingVertical:6, borderRadius:10, borderWidth:1, borderColor:'rgba(255,255,255,0.18)', backgroundColor:'rgba(255,255,255,0.08)' },
});
