
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { useApp, uid, nowIso } from '../state';
import { Ingredient, Post } from '../types';

export default function CreateScreen(){
  const { state, setState } = useApp();
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: 'White Rum 40%', ml: 45, abvPct: 40, costPerLiter: 120 }, { name: 'Lime', ml: 30, costPerLiter: 15 }, { name: 'Syrup', ml: 20, costPerLiter: 8 }]);
  const [abv, setAbv] = useState<number | undefined>(18);
  const [ph, setPh] = useState<number | undefined>(3.2);
  const [brix, setBrix] = useState<number | undefined>(12);
  const cost = useMemo(()=> ingredients.reduce((s,i)=> s + (i.costPerLiter||0) * (i.ml/1000), 0), [ingredients]);

  const add = () => setIngredients(prev => [...prev, { name: '', ml: 0 }]);
  const publish = () => {
    const post: Post = { id: uid('p'), authorId: state.meId, createdAt: nowIso(), caption, media: mediaUrl? [{ type: mediaUrl.endsWith('.mp4')?'video':'image', url: mediaUrl, aspect: 1 }] : [], likes: 0, comments: [], kind: 'spec', recipe: { abv, brix, ph, ingredients } };
    setState(s => ({ ...s, posts: [post, ...s.posts] }));
    setCaption(''); setMediaUrl('');
  };

  return (
    <ScrollView style={{ flex:1, backgroundColor:'#020617' }} contentContainerStyle={{ padding:12, paddingBottom:96 }}>
      <Text style={{ color:'#fff', fontWeight:'700', marginBottom:8 }}>Create Spec Post</Text>
      <TextInput placeholder="Write a caption" placeholderTextColor="#64748b" value={caption} onChangeText={setCaption} style={styles.input} />
      <TextInput placeholder="Media URL (image or mp4)" placeholderTextColor="#64748b" value={mediaUrl} onChangeText={setMediaUrl} style={styles.input} />
      <View style={{ flexDirection:'row', gap:8 }}>
        <NumberField label="ABV%" value={abv} onChange={setAbv} />
        <NumberField label="pH" value={ph} onChange={setPh} />
        <NumberField label="Brix" value={brix} onChange={setBrix} />
      </View>
      <View style={{ marginTop:8 }}>
        <Text style={{ color:'#94a3b8', fontSize:12, marginBottom:4 }}>Ingredients</Text>
        {ingredients.map((i,idx)=>(
          <View key={idx} style={{ flexDirection:'row', gap:8, marginBottom:6 }}>
            <TextInput placeholder="Name" placeholderTextColor="#64748b" value={i.name} onChangeText={t=>setIngredients(prev=> prev.map((p,j)=> j===idx?{...p, name:t}:p))} style={[styles.input, { flex:4 }]} />
            <TextInput placeholder="ml" placeholderTextColor="#64748b" keyboardType="numeric" value={String(i.ml)} onChangeText={t=>setIngredients(prev=> prev.map((p,j)=> j===idx?{...p, ml:Number(t)||0}:p))} style={[styles.input, { flex:2 }]} />
            <TextInput placeholder="ABV%" placeholderTextColor="#64748b" keyboardType="numeric" value={String(i.abvPct||0)} onChangeText={t=>setIngredients(prev=> prev.map((p,j)=> j===idx?{...p, abvPct:Number(t)||0}:p))} style={[styles.input, { flex:2 }]} />
            <TextInput placeholder="Cost/L" placeholderTextColor="#64748b" keyboardType="numeric" value={String(i.costPerLiter||0)} onChangeText={t=>setIngredients(prev=> prev.map((p,j)=> j===idx?{...p, costPerLiter:Number(t)||0}:p))} style={[styles.input, { flex:2 }]} />
          </View>
        ))}
        <TouchableOpacity onPress={add} style={styles.btn}><Text style={{ color:'#a7f3d0' }}>+ Ingredient</Text></TouchableOpacity>
      </View>
      <TouchableOpacity onPress={publish} style={[styles.btn, { marginTop:12 }]}><Text style={{ color:'#e6e6e6' }}>Publish</Text></TouchableOpacity>
    </ScrollView>
  )
}
function NumberField({ label, value, onChange }:{ label:string; value?:number; onChange:(n:number)=>void }){
  return (<View style={{ flex:1 }}><Text style={{ color:'#94a3b8', fontSize:12, marginBottom:4 }}>{label}</Text><TextInput keyboardType="numeric" value={String(value??0)} onChangeText={t=>onChange(Number(t)||0)} placeholderTextColor="#64748b" style={styles.input} /></View>)
}
const styles = { input: { flex:1, paddingHorizontal:12, paddingVertical:10, borderRadius:12, borderWidth:1, borderColor:'rgba(255,255,255,0.2)', color:'#fff', marginBottom:8 }, btn: { alignSelf:'flex-start', paddingHorizontal:12, paddingVertical:10, borderRadius:12, borderWidth:1, borderColor:'rgba(16,185,129,0.35)', backgroundColor:'rgba(16,185,129,0.12)' } } as const;
