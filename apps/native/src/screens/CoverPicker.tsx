import React, { useMemo } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { queryClient } from '../lib/queryClient';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type MediaAsset = {
  id: string;
  asset_type: string | null;
  status: string | null;
  public_url: string | null;
  thumbnail_url: string | null;
  updated_at: string;
};

function safeExtFromMime(mime: string | null | undefined) {
  const t = (mime ?? '').toLowerCase();
  if (t.includes('png')) return 'png';
  if (t.includes('jpeg') || t.includes('jpg')) return 'jpg';
  if (t.includes('heic')) return 'heic';
  return 'jpg';
}

export default function CoverPickerScreen({
  navigation,
  route,
}: {
  navigation: Nav;
  route: { params: { draftId: string } };
}) {
  const { user } = useAuth();
  const draftId = route.params.draftId;

  const assets = useQuery({
    queryKey: ['studio', 'coverAssets', draftId],
    queryFn: async (): Promise<MediaAsset[]> => {
      const res = await supabase
        .from('media_assets')
        .select('id, asset_type, status, public_url, thumbnail_url, updated_at')
        .eq('draft_id', draftId)
        .eq('status', 'ready')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as MediaAsset[];
    },
  });

  const setCover = useMutation({
    mutationFn: async ({ assetId }: { assetId: string }) => {
      const res = await supabase.from('studio_drafts').update({ cover_asset_id: assetId }).eq('id', draftId);
      if (res.error) throw res.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['studio', 'draft', draftId] });
      await queryClient.invalidateQueries({ queryKey: ['studio', 'drafts'] });
    },
    onError: (e: any) => Alert.alert('Failed', e?.message ?? 'Unable to set cover'),
  });

  const uploadCover = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not signed in');

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error('Photo library permission is required');

      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.95,
      });
      if (picked.canceled) return null;

      const a = picked.assets[0];
      const mime = (a as any).mimeType as string | undefined;
      const ext = safeExtFromMime(mime);
      const fileName = (a as any).fileName || `cover.${ext}`;
      const contentType = mime || 'image/jpeg';

      const blob = await (await fetch(a.uri)).blob();
      const path = `uploads/${user.id}/${draftId}/covers/${Date.now()}-${fileName}`;

      const up = await supabase.storage.from('media').upload(path, blob, { upsert: true, contentType });
      if (up.error) throw up.error;

      const { data: pub } = supabase.storage.from('media').getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const ins = await supabase
        .from('media_assets')
        .insert({
          user_id: user.id,
          draft_id: draftId,
          asset_type: 'thumbnail',
          status: 'ready',
          storage_path: path,
          public_url: publicUrl,
          thumbnail_url: null,
          file_size: blob.size,
          mime_type: contentType,
        })
        .select('id')
        .single();
      if (ins.error) throw ins.error;

      await supabase.from('studio_drafts').update({ cover_asset_id: ins.data.id }).eq('id', draftId);

      return ins.data.id as string;
    },
    onSuccess: async (assetId) => {
      if (!assetId) return;
      await queryClient.invalidateQueries({ queryKey: ['studio', 'coverAssets', draftId] });
      await queryClient.invalidateQueries({ queryKey: ['studio', 'draft', draftId] });
      await queryClient.invalidateQueries({ queryKey: ['studio', 'drafts'] });
      Alert.alert('Cover updated', 'Cover image uploaded and selected.');
    },
    onError: (e: any) => Alert.alert('Upload failed', e?.message ?? 'Unknown error'),
  });

  const items = useMemo(() => assets.data ?? [], [assets.data]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Choose cover
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Draft {draftId.slice(0, 8)}
          </Text>
        </View>
        <Pressable style={[styles.btn, styles.primaryBtn]} onPress={() => uploadCover.mutate()} disabled={uploadCover.isPending}>
          <Text style={styles.btnText}>{uploadCover.isPending ? 'Uploading…' : 'Upload cover'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        {assets.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
        {assets.isError ? <Text style={[styles.muted, { color: '#ef4444' }]}>Failed to load assets.</Text> : null}

        {items.length === 0 && !assets.isLoading ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>No ready media assets</Text>
            <Text style={styles.muted}>Upload media (or upload a cover) to select a cover image.</Text>
          </View>
        ) : null}

        <View style={styles.grid}>
          {items.map((it) => {
            const url = it.thumbnail_url || it.public_url || '';
            return (
              <Pressable
                key={it.id}
                style={styles.tile}
                onPress={() => setCover.mutate({ assetId: it.id })}
                disabled={setCover.isPending}
              >
                {url ? (
                  <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <View style={styles.tileEmpty}>
                    <Text style={{ color: '#9aa4b2', fontWeight: '900' }}>No preview</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
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
  primaryBtn: { borderColor: 'rgba(37,99,235,0.55)', backgroundColor: 'rgba(37,99,235,0.18)' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  sectionTitle: { color: '#fff', fontWeight: '900' },
  muted: { color: '#9aa4b2', marginTop: 8, fontSize: 12, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  tile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tileEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

