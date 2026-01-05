
import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { Video } from 'expo-av';
import { useApp } from '../state';
import { FlatList } from 'react-native';

const H = Dimensions.get('window').height;

export default function ReelsScreen(){
  const { state } = useApp();
  const videos = state.posts.filter(p => p.media[0]?.type==='video');
  return (
    <FlatList data={videos} keyExtractor={(item)=>item.id} pagingEnabled renderItem={({item}) => (
      <View style={{ height: H, backgroundColor:'#000', justifyContent:'center' }}>
        <Video source={{ uri: item.media[0].url }} style={{ width:'100%', height:'100%' }} resizeMode="cover" isLooping shouldPlay isMuted />
        <View style={{ position:'absolute', bottom:100, left:12, right:12 }}><Text style={{ color:'#fff', fontWeight:'700' }}>{item.caption}</Text></View>
      </View>
    )} />
  )
}
