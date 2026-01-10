import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { queryClient } from '../lib/queryClient';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type UploadSessionRow = {
  id: string;
  file_name: string;
  file_size: number | string;
  file_type: string;
  status: string;
  total_chunks: number | string;
  uploaded_chunks: number | string;
  priority: number;
  error_message: string | null;
  created_at: string;
};

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB (matches web)

function toNumber(v: number | string | null | undefined) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatFileSize(bytes: number | string) {
  const b = toNumber(bytes);
  if (!Number.isFinite(b)) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function progressPct(s: UploadSessionRow) {
  const total = toNumber(s.total_chunks);
  const uploaded = toNumber(s.uploaded_chunks);
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((uploaded / total) * 100)));
}

function safeExtFromMime(mime: string | null | undefined) {
  const t = (mime ?? '').toLowerCase();
  if (t.includes('png')) return 'png';
  if (t.includes('jpeg') || t.includes('jpg')) return 'jpg';
  if (t.includes('heic')) return 'heic';
  if (t.includes('mp4')) return 'mp4';
  if (t.includes('mov')) return 'mov';
  if (t.includes('webm')) return 'webm';
  return 'bin';
}

export default function UploadsScreen({
  navigation,
  route,
}: {
  navigation: Nav;
  route?: { params?: { draftId?: string } };
}) {
  const { user } = useAuth();
  const draftId = route?.params?.draftId;

  const sessions = useQuery({
    queryKey: ['studio', 'uploads', user?.id ?? 'anon'],
    queryFn: async (): Promise<UploadSessionRow[]> => {
      if (!user?.id) return [];
      const res = await supabase
        .from('upload_sessions')
        .select('id, file_name, file_size, file_type, status, total_chunks, uploaded_chunks, priority, error_message, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as UploadSessionRow[];
    },
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('upload_sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'upload_sessions', filter: `user_id=eq.${user.id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['studio', 'uploads', user.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const updateSession = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<UploadSessionRow> }) => {
      const res = await supabase.from('upload_sessions').update(updates).eq('id', id);
      if (res.error) throw res.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['studio', 'uploads'] });
    },
  });

  const uploadToDraft = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not signed in');
      if (!draftId) throw new Error('Open from a draft to attach media');

      let sessionId: string | null = null;
      let mediaAssetId: string | null = null;

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error('Photo library permission is required');

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: false,
        quality: 0.9,
      });
      if (result.canceled) return;
      const asset = result.assets[0];

      const mime = (asset as any).mimeType as string | undefined;
      const isVideo = asset.type === 'video';
      const ext = safeExtFromMime(mime) || (isVideo ? 'mp4' : 'jpg');
      const fileName = (asset as any).fileName || `upload.${ext}`;
      const fileType = mime || (isVideo ? 'video/mp4' : 'image/jpeg');

      try {
        const blob = await (await fetch(asset.uri)).blob();
        const fileSize = blob.size;

        // Create media asset first (upload_sessions links to it via media_asset_id)
        const assetRes = await supabase
          .from('media_assets')
          .insert({
            user_id: user.id,
            draft_id: draftId,
            asset_type: isVideo ? 'video' : 'image',
            status: 'uploading',
            file_size: fileSize,
            mime_type: fileType,
            storage_path: null,
            public_url: null,
            thumbnail_url: null,
          })
          .select('id')
          .single();
        if (assetRes.error) throw assetRes.error;
        mediaAssetId = assetRes.data.id as string;

        const totalChunks = Math.max(1, Math.ceil(fileSize / CHUNK_SIZE));
        const sessionRes = await supabase
          .from('upload_sessions')
          .insert({
            user_id: user.id,
            media_asset_id: mediaAssetId,
            status: 'active',
            file_name: fileName,
            file_size: fileSize,
            file_type: fileType,
            chunk_size: CHUNK_SIZE,
            total_chunks: totalChunks,
            uploaded_chunks: 0,
            priority: 0,
          })
          .select('id')
          .single();
        if (sessionRes.error) throw sessionRes.error;
        sessionId = sessionRes.data.id as string;

        // Upload chunk objects (for parity/observability), then upload final object.
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, fileSize);
          const chunk = blob.slice(start, end);
          const chunkPath = `uploads/${user.id}/${sessionId}/chunk_${i}`;

          const upChunk = await supabase.storage.from('media').upload(chunkPath, chunk, { upsert: true, contentType: fileType });
          if (upChunk.error) throw upChunk.error;

          const insChunk = await supabase.from('upload_chunks').insert({
            session_id: sessionId,
            chunk_index: i,
            chunk_size: chunk.size,
            uploaded: true,
            verified: false,
            storage_path: chunkPath,
          });
          if (insChunk.error) throw insChunk.error;

          const upd = await supabase.from('upload_sessions').update({ uploaded_chunks: i + 1 }).eq('id', sessionId);
          if (upd.error) throw upd.error;
        }

        const finalPath = `uploads/${user.id}/${sessionId}/${fileName}`;
        const upFinal = await supabase.storage.from('media').upload(finalPath, blob, { upsert: true, contentType: fileType });
        if (upFinal.error) throw upFinal.error;

        const { data: pub } = supabase.storage.from('media').getPublicUrl(finalPath);
        const publicUrl = pub.publicUrl;

        const updAsset = await supabase
          .from('media_assets')
          .update({ status: 'ready', storage_path: finalPath, public_url: publicUrl })
          .eq('id', mediaAssetId);
        if (updAsset.error) throw updAsset.error;

        await supabase.from('history_events').insert({
          draft_id: draftId,
          user_id: user.id,
          event_type: 'UPLOAD_COMPLETED',
          event_data: { file_name: fileName, storage_path: finalPath, media_asset_id: mediaAssetId },
        });

        const done = await supabase
          .from('upload_sessions')
          .update({ status: 'completed', uploaded_chunks: totalChunks, error_message: null })
          .eq('id', sessionId);
        if (done.error) throw done.error;

        await queryClient.invalidateQueries({ queryKey: ['studio', 'draft', draftId] });
        await queryClient.invalidateQueries({ queryKey: ['studio', 'drafts'] });
        await queryClient.invalidateQueries({ queryKey: ['studio', 'uploads'] });
      } catch (e: any) {
        const msg = e?.message ?? 'Upload failed';
        if (sessionId) {
          try {
            await supabase.from('upload_sessions').update({ status: 'failed', error_message: msg }).eq('id', sessionId);
          } catch {
            // ignore
          }
        }
        if (mediaAssetId) {
          try {
            await supabase.from('media_assets').update({ status: 'failed', processing_error: msg }).eq('id', mediaAssetId);
          } catch {
            // ignore
          }
        }
        throw e;
      }
    },
    onSuccess: () => {
      Alert.alert('Uploaded', 'Media attached to your draft.');
    },
    onError: (e: any) => {
      Alert.alert('Upload failed', e?.message ?? 'Unknown error');
    },
  });

  const headerSub = useMemo(() => {
    if (draftId) return `Attach media to draft ${draftId.slice(0, 8)}`;
    return 'View and manage upload sessions';
  }, [draftId]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Uploads
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {headerSub}
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() => navigation.navigate('WebRoute', { title: 'Uploads', pathTemplate: '/uploads' })}
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        {draftId ? (
          <Pressable
            style={[styles.primaryBtn, uploadToDraft.isPending && { opacity: 0.6 }]}
            onPress={() => uploadToDraft.mutate()}
            disabled={uploadToDraft.isPending}
          >
            <Text style={styles.primaryBtnText}>{uploadToDraft.isPending ? 'Uploading…' : 'Pick media and upload'}</Text>
          </Pressable>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Upload to a draft</Text>
            <Text style={styles.muted}>Open this screen from a Studio draft to attach media.</Text>
          </View>
        )}

        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sessions</Text>
          {sessions.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
          {sessions.isError ? <Text style={[styles.muted, { color: '#ef4444' }]}>Failed to load sessions.</Text> : null}

          <View style={{ height: 10 }} />

          {(sessions.data ?? []).length === 0 && !sessions.isLoading ? (
            <Text style={styles.muted}>No uploads.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {(sessions.data ?? []).map((s) => (
                <View key={s.id} style={styles.item}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={styles.iconBox}>
                      <Ionicons name="cloud-upload-outline" size={18} color="#9aa4b2" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {s.file_name}
                      </Text>
                      <Text style={styles.itemSub} numberOfLines={1}>
                        {formatFileSize(s.file_size)} • {s.uploaded_chunks}/{s.total_chunks} • {s.status}
                      </Text>
                      {s.error_message ? <Text style={[styles.itemSub, { color: '#ef4444' }]}>{s.error_message}</Text> : null}
                    </View>
                    <Text style={styles.pct}>{progressPct(s)}%</Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    {s.status === 'active' ? (
                      <Pressable
                        style={styles.smallBtn}
                        onPress={() => updateSession.mutate({ id: s.id, updates: { status: 'paused' } as any })}
                        disabled={updateSession.isPending}
                      >
                        <Text style={styles.smallBtnText}>Pause</Text>
                      </Pressable>
                    ) : null}
                    {s.status === 'paused' ? (
                      <Pressable
                        style={styles.smallBtn}
                        onPress={() => updateSession.mutate({ id: s.id, updates: { status: 'active' } as any })}
                        disabled={updateSession.isPending}
                      >
                        <Text style={styles.smallBtnText}>Resume</Text>
                      </Pressable>
                    ) : null}
                    {s.status === 'failed' ? (
                      <Pressable
                        style={styles.smallBtn}
                        onPress={() => updateSession.mutate({ id: s.id, updates: { status: 'active', error_message: null } as any })}
                        disabled={updateSession.isPending}
                      >
                        <Text style={styles.smallBtnText}>Retry</Text>
                      </Pressable>
                    ) : null}
                    {s.status !== 'cancelled' ? (
                      <Pressable
                        style={[styles.smallBtn, styles.dangerBtn]}
                        onPress={() =>
                          Alert.alert('Cancel upload?', 'This will mark the session as cancelled.', [
                            { text: 'No', style: 'cancel' },
                            {
                              text: 'Cancel',
                              style: 'destructive',
                              onPress: () => updateSession.mutate({ id: s.id, updates: { status: 'cancelled' } as any }),
                            },
                          ])
                        }
                        disabled={updateSession.isPending}
                      >
                        <Text style={[styles.smallBtnText, { color: '#fecaca' }]}>Cancel</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
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
  secondaryBtn: {},
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  sectionTitle: { color: '#fff', fontWeight: '900' },
  muted: { color: '#9aa4b2', marginTop: 8, fontSize: 12, lineHeight: 18 },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(37,99,235,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.55)',
  },
  primaryBtnText: { color: '#e2e8f0', fontWeight: '900' },
  item: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  itemTitle: { color: '#fff', fontWeight: '900' },
  itemSub: { color: '#9aa4b2', fontSize: 12, marginTop: 2, fontWeight: '700' },
  pct: { color: '#9aa4b2', fontWeight: '900' },
  smallBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  smallBtnText: { color: '#e2e8f0', fontWeight: '900', fontSize: 12 },
  dangerBtn: { borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.10)' },
});

