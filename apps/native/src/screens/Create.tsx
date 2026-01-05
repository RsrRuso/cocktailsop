
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useCreatePost } from '../features/social/mutations';

export default function CreateScreen(){
  const { user } = useAuth();
  const createPost = useCreatePost();

  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const canPublish = useMemo(() => content.trim().length > 0 && !!user?.id, [content, user?.id]);

  const publish = async () => {
    if (!user?.id || !canPublish || createPost.isPending) return;
    try {
      await createPost.mutateAsync({
        userId: user.id,
        content: content.trim(),
        mediaUrl: mediaUrl.trim() || undefined,
      });
      setContent('');
      setMediaUrl('');
      Alert.alert('Posted', 'Your post is live.');
    } catch (e: any) {
      Alert.alert('Failed to post', e?.message ?? 'Unknown error');
    }
  };

  return (
    <ScrollView style={{ flex:1, backgroundColor:'#020617' }} contentContainerStyle={{ padding:12, paddingBottom:96 }}>
      <Text style={{ color:'#fff', fontWeight:'800', marginBottom:8 }}>Create Post</Text>
      <TextInput
        placeholder="What’s happening?"
        placeholderTextColor="#64748b"
        value={content}
        onChangeText={setContent}
        style={[styles.input, { minHeight: 96, textAlignVertical: 'top' }]}
        multiline
      />
      <TextInput
        placeholder="Optional media URL"
        placeholderTextColor="#64748b"
        value={mediaUrl}
        onChangeText={setMediaUrl}
        style={styles.input}
        autoCapitalize="none"
      />

      <TouchableOpacity
        onPress={() => publish().catch(() => {})}
        style={[
          styles.btn,
          { marginTop: 4, borderColor: 'rgba(37,99,235,0.55)', backgroundColor: 'rgba(37,99,235,0.18)' },
          (!canPublish || createPost.isPending) && { opacity: 0.6 },
        ]}
        disabled={!canPublish || createPost.isPending}
      >
        <Text style={{ color:'#e6e6e6', fontWeight:'800' }}>{createPost.isPending ? 'Publishing…' : 'Publish'}</Text>
      </TouchableOpacity>

      <Text style={{ color:'#9aa4b2', marginTop: 10 }}>
        Next: media picker + uploads, stories, reels, and drafts.
      </Text>
    </ScrollView>
  )
}
const styles = { input: { flex:1, paddingHorizontal:12, paddingVertical:10, borderRadius:12, borderWidth:1, borderColor:'rgba(255,255,255,0.2)', color:'#fff', marginBottom:8 }, btn: { alignSelf:'flex-start', paddingHorizontal:12, paddingVertical:10, borderRadius:12, borderWidth:1, borderColor:'rgba(16,185,129,0.35)', backgroundColor:'rgba(16,185,129,0.12)' } } as const;
