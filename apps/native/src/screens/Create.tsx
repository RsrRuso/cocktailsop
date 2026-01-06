
import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { useCreatePost } from '../features/social/mutations';
import { useCreateReel, useCreateStory } from '../features/social/create';
import { uploadAssetToBucket } from '../lib/storageUpload';

export default function CreateScreen({ route }: { route?: { params?: { mode?: 'post' | 'story' | 'reel' } } }) {
  const routeParams = route?.params ?? {};
  const { user } = useAuth();
  const createPost = useCreatePost();
  const createStory = useCreateStory();
  const createReel = useCreateReel();

  const [mode, setMode] = useState<'post' | 'story' | 'reel'>(routeParams.mode ?? 'post');
  const [content, setContent] = useState('');
  const [caption, setCaption] = useState('');
  const [assets, setAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const canPublish = useMemo(() => {
    if (!user?.id) return false;
    if (mode === 'post') return content.trim().length > 0 || assets.length > 0;
    if (mode === 'story') return assets.length === 1;
    return assets.length === 1 && assets[0]?.type === 'video';
  }, [mode, content, assets, user?.id]);

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Please allow photo library access.');
      return;
    }

    const mediaTypes =
      mode === 'reel'
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.All;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsMultipleSelection: mode === 'post',
      quality: 0.9,
    });
    if (result.canceled) return;
    setAssets(result.assets);
  };

  // If some screen navigates to Create with a target mode, apply it.
  React.useEffect(() => {
    if (routeParams.mode && routeParams.mode !== mode) {
      setMode(routeParams.mode);
      setAssets([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeParams.mode]);

  const publish = async () => {
    if (!user?.id || !canPublish) return;
    if (createPost.isPending || createStory.isPending || createReel.isPending) return;
    try {
      if (mode === 'post') {
        const urls: string[] = [];
        for (const a of assets) {
          const up = await uploadAssetToBucket({ bucket: 'posts', userId: user.id, asset: a });
          urls.push(up.publicUrl);
        }
        await createPost.mutateAsync({ userId: user.id, content: content.trim() || '', mediaUrls: urls });
        setContent('');
        setAssets([]);
        Alert.alert('Posted', 'Your post is live.');
        return;
      }

      if (mode === 'story') {
        const a = assets[0];
        const up = await uploadAssetToBucket({ bucket: 'stories', userId: user.id, asset: a });
        await createStory.mutateAsync({ userId: user.id, mediaUrl: up.publicUrl, mediaType: a.type ?? 'image' });
        setAssets([]);
        Alert.alert('Story added', 'Your story is live.');
        return;
      }

      // reel
      const a = assets[0];
      const up = await uploadAssetToBucket({ bucket: 'reels', userId: user.id, asset: a });
      await createReel.mutateAsync({ userId: user.id, videoUrl: up.publicUrl, caption: caption.trim() || undefined });
      setAssets([]);
      setCaption('');
      Alert.alert('Reel posted', 'Your reel is live.');
    } catch (e: any) {
      Alert.alert('Failed to post', e?.message ?? 'Unknown error');
    }
  };

  return (
    <ScrollView style={{ flex:1, backgroundColor:'#020617' }} contentContainerStyle={{ padding:12, paddingBottom:96 }}>
      <Text style={{ color:'#fff', fontWeight:'900', marginBottom:8, fontSize: 18 }}>Create</Text>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        {(['post','story','reel'] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => { setMode(m); setAssets([]); }}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              alignItems: 'center',
              backgroundColor: mode === m ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '900' }}>{m.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      {mode === 'post' ? (
        <>
          <TextInput
            placeholder="What’s happening?"
            placeholderTextColor="#64748b"
            value={content}
            onChangeText={setContent}
            style={[styles.input, { minHeight: 96, textAlignVertical: 'top' }]}
            multiline
          />
        </>
      ) : null}

      {mode === 'reel' ? (
        <TextInput
          placeholder="Caption (optional)"
          placeholderTextColor="#64748b"
          value={caption}
          onChangeText={setCaption}
          style={styles.input}
        />
      ) : null}

      <TouchableOpacity onPress={() => pick().catch(() => {})} style={[styles.btn, { marginTop: 4 }]}>
        <Text style={{ color:'#e6e6e6', fontWeight:'800' }}>{mode === 'post' ? 'Pick media' : mode === 'story' ? 'Pick story media' : 'Pick reel video'}</Text>
      </TouchableOpacity>

      {assets.length > 0 ? (
        <View style={{ marginTop: 12, gap: 8 }}>
          <Text style={{ color:'#9aa4b2' }}>{assets.length} selected</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {assets.map((a) => (
              <View key={a.uri} style={{ width: '33.33%', padding: 2 }}>
                {a.type === 'image' ? (
                  <Image source={{ uri: a.uri }} style={{ width: '100%', aspectRatio: 1 }} />
                ) : (
                  <View style={{ width: '100%', aspectRatio: 1, backgroundColor: '#0b0f19', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#9aa4b2' }}>Video</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
          <Pressable onPress={() => setAssets([])} style={{ alignSelf: 'flex-start', paddingVertical: 8 }}>
            <Text style={{ color:'#9aa4b2', fontWeight:'800' }}>Clear selection</Text>
          </Pressable>
        </View>
      ) : null}

      <TouchableOpacity
        onPress={() => publish().catch(() => {})}
        style={[
          styles.btn,
          { marginTop: 4, borderColor: 'rgba(37,99,235,0.55)', backgroundColor: 'rgba(37,99,235,0.18)' },
          (!canPublish || createPost.isPending || createStory.isPending || createReel.isPending) && { opacity: 0.6 },
        ]}
        disabled={!canPublish || createPost.isPending || createStory.isPending || createReel.isPending}
      >
        <Text style={{ color:'#e6e6e6', fontWeight:'800' }}>
          {createPost.isPending || createStory.isPending || createReel.isPending ? 'Publishing…' : 'Publish'}
        </Text>
      </TouchableOpacity>

      <Text style={{ color:'#9aa4b2', marginTop: 10 }}>
        Uses buckets: `posts`, `stories`, `reels` (must exist in Supabase Storage).
      </Text>
    </ScrollView>
  )
}
const styles = { input: { flex:1, paddingHorizontal:12, paddingVertical:10, borderRadius:12, borderWidth:1, borderColor:'rgba(255,255,255,0.2)', color:'#fff', marginBottom:8 }, btn: { alignSelf:'flex-start', paddingHorizontal:12, paddingVertical:10, borderRadius:12, borderWidth:1, borderColor:'rgba(16,185,129,0.35)', backgroundColor:'rgba(16,185,129,0.12)' } } as const;
