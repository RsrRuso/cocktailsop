import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { queryClient } from '../lib/queryClient';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type ReelRow = { id: string; user_id: string; caption: string | null; video_url: string };

export default function EditReelScreen({
  navigation,
  route,
}: {
  navigation: Nav;
  route: { params: { reelId: string } };
}) {
  const { user } = useAuth();
  const reelId = route.params.reelId;
  const [caption, setCaption] = useState('');

  const reel = useQuery({
    queryKey: ['reel', reelId, 'edit'],
    queryFn: async (): Promise<ReelRow> => {
      const res = await supabase.from('reels').select('id, user_id, caption, video_url').eq('id', reelId).single();
      if (res.error) throw res.error;
      return res.data as unknown as ReelRow;
    },
  });

  useEffect(() => {
    if (!reel.data) return;
    setCaption(reel.data.caption ?? '');
  }, [reel.data?.id]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not signed in');
      if (!reel.data) throw new Error('Reel not loaded');
      if (reel.data.user_id !== user.id) throw new Error("You don't have permission");

      const res = await supabase.from('reels').update({ caption }).eq('id', reelId);
      if (res.error) throw res.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reel', reelId] });
      await queryClient.invalidateQueries({ queryKey: ['user-reels'] });
      Alert.alert('Saved', 'Reel updated.');
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('Failed', e?.message ?? 'Unable to save'),
  });

  const del = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not signed in');
      if (!reel.data) throw new Error('Reel not loaded');
      if (reel.data.user_id !== user.id) throw new Error("You don't have permission");
      const res = await supabase.from('reels').delete().eq('id', reelId);
      if (res.error) throw res.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-reels'] });
      await queryClient.invalidateQueries({ queryKey: ['profile', 'counts'] });
      Alert.alert('Deleted', 'Reel removed.');
      navigation.navigate('Reels');
    },
    onError: (e: any) => Alert.alert('Failed', e?.message ?? 'Unable to delete'),
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Edit reel
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Basic editor + web fallback
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() => navigation.navigate('WebRoute', { title: 'Edit reel', pathTemplate: '/edit-reel/:id', initialParams: { id: reelId } })}
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        {reel.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
        {reel.isError ? <Text style={[styles.muted, { color: '#ef4444' }]}>Failed to load reel.</Text> : null}

        {reel.data?.video_url ? (
          <View style={styles.videoWrap}>
            <Video
              source={{ uri: reel.data.video_url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode={ResizeMode.COVER}
              useNativeControls
              shouldPlay={false}
              isLooping
            />
          </View>
        ) : null}

        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Caption</Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Write a caption…"
            placeholderTextColor="#6b7280"
            style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
            multiline
          />
          <Text style={styles.muted}>Media editing is web-only for now.</Text>
        </View>

        <View style={{ height: 12 }} />

        <Pressable style={[styles.primaryBtn, save.isPending && { opacity: 0.6 }]} disabled={save.isPending} onPress={() => save.mutate()}>
          <Text style={styles.primaryBtnText}>{save.isPending ? 'Saving…' : 'Save changes'}</Text>
        </Pressable>

        <View style={{ height: 10 }} />

        <Pressable
          style={[styles.btn, { borderColor: 'rgba(239,68,68,0.40)', backgroundColor: 'rgba(239,68,68,0.10)' }, del.isPending && { opacity: 0.6 }]}
          disabled={del.isPending}
          onPress={() =>
            Alert.alert('Delete reel?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => del.mutate() },
            ])
          }
        >
          <Text style={[styles.btnText, { color: '#fecaca' }]}>{del.isPending ? 'Deleting…' : 'Delete reel'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1220' },
  header: {
    paddingTop: 16,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  backText: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: -2 },
  title: { color: '#fff', fontSize: 18, fontWeight: '900' },
  sub: { color: '#9aa4b2', fontSize: 12, marginTop: 2 },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  secondaryBtn: {},
  muted: { color: '#9aa4b2', marginTop: 8, fontSize: 12, lineHeight: 18 },
  videoWrap: {
    width: '100%',
    height: 420,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  sectionTitle: { color: '#fff', fontWeight: '900' },
  input: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(37,99,235,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.55)',
  },
  primaryBtnText: { color: '#e2e8f0', fontWeight: '900' },
});

