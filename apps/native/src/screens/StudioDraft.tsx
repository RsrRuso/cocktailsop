import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Video, ResizeMode } from 'expo-av';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { queryClient } from '../lib/queryClient';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type DraftRow = {
  id: string;
  draft_type: string;
  status: string;
  caption: string | null;
  hashtags: string[] | null;
  location: string | null;
  visibility: string | null;
  needs_approval: boolean | null;
  trim_start: number | null;
  trim_end: number | null;
  aspect_ratio: string | null;
  cover_asset_id: string | null;
  crop_data: any | null;
  updated_at: string;
};

type MediaAssetRow = {
  id?: string;
  status: string | null;
  public_url: string | null;
  thumbnail_url: string | null;
  asset_type: string | null;
};

function normalizeHashtags(input: string) {
  return input
    .split(/\s+/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.startsWith('#'));
}

function toNumberOrNull(s: string) {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export default function StudioDraftScreen({
  navigation,
  route,
}: {
  navigation: Nav;
  route: { params: { draftId: string } };
}) {
  const { user } = useAuth();
  const draftId = route.params.draftId;

  const draftQuery = useQuery({
    queryKey: ['studio', 'draft', draftId],
    queryFn: async () => {
      const res = await supabase.from('studio_drafts').select('*').eq('id', draftId).single();
      if (res.error) throw res.error;

      const assetRes = await supabase
        .from('media_assets')
        .select('id, status, public_url, thumbnail_url, asset_type')
        .eq('draft_id', draftId)
        .eq('status', 'ready')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // assetRes.error is ok if none found; but surface real errors
      if (assetRes.error) throw assetRes.error;

      return {
        draft: res.data as unknown as DraftRow,
        media: (assetRes.data ?? null) as unknown as MediaAssetRow | null,
      };
    },
  });

  const [caption, setCaption] = useState('');
  const [hashtagsText, setHashtagsText] = useState('');
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const [needsApproval, setNeedsApproval] = useState(false);
  const [trimStart, setTrimStart] = useState('0');
  const [trimEnd, setTrimEnd] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1' | '4:5' | '16:9'>('9:16');

  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Local snapshot used for autosave change detection.
  const lastLoadedRef = useRef<string>('');
  const pendingRef = useRef<Partial<DraftRow>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const d = draftQuery.data?.draft;
    if (!d) return;

    const key = JSON.stringify({
      id: d.id,
      caption: d.caption ?? '',
      hashtags: d.hashtags ?? [],
      location: d.location ?? '',
      visibility: (d.visibility ?? 'public') as string,
      needs_approval: !!d.needs_approval,
      trim_start: d.trim_start ?? 0,
      trim_end: d.trim_end ?? null,
      aspect_ratio: d.aspect_ratio ?? '9:16',
      cover_asset_id: d.cover_asset_id ?? null,
    });
    if (key === lastLoadedRef.current) return;
    lastLoadedRef.current = key;

    setCaption(d.caption ?? '');
    setHashtagsText((d.hashtags ?? []).join(' '));
    setLocation(d.location ?? '');
    setVisibility(((d.visibility ?? 'public') as any) === 'followers' ? 'followers' : ((d.visibility ?? 'public') as any) === 'private' ? 'private' : 'public');
    setNeedsApproval(!!d.needs_approval);
    setTrimStart(String(d.trim_start ?? 0));
    setTrimEnd(d.trim_end == null ? '' : String(d.trim_end));
    const ar = (d.aspect_ratio ?? '9:16') as any;
    setAspectRatio(ar === '1:1' || ar === '4:5' || ar === '16:9' ? ar : '9:16');
  }, [draftQuery.data?.draft]);

  const doSave = useMutation({
    mutationFn: async (updates: Partial<DraftRow>) => {
      if (!user?.id) throw new Error('Not signed in');
      const res = await supabase
        .from('studio_drafts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', draftId);
      if (res.error) throw res.error;

      // best-effort audit trail
      await supabase.from('history_events').insert({
        draft_id: draftId,
        user_id: user.id,
        event_type: 'DRAFT_UPDATED',
        event_data: { changes: Object.keys(updates) },
      });
    },
    onMutate: () => setSaving(true),
    onSuccess: async () => {
      setLastSavedAt(new Date());
      await queryClient.invalidateQueries({ queryKey: ['studio', 'draft', draftId] });
      await queryClient.invalidateQueries({ queryKey: ['studio', 'drafts'] });
    },
    onError: () => {
      // keep silent; user can still "Open web" if something is wrong
    },
    onSettled: () => setSaving(false),
  });

  function scheduleSave(partial: Partial<DraftRow>) {
    pendingRef.current = { ...pendingRef.current, ...partial };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const updates = pendingRef.current;
      pendingRef.current = {};
      if (Object.keys(updates).length === 0) return;
      doSave.mutate(updates);
    }, 800);
  }

  // Flush pending saves on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const updates = pendingRef.current;
      pendingRef.current = {};
      if (Object.keys(updates).length > 0) {
        // fire-and-forget
        doSave.mutate(updates);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draftType = (draftQuery.data?.draft.draft_type ?? 'reel').toLowerCase();
  const media = draftQuery.data?.media ?? null;

  const coverPreviewUrl = useMemo(() => {
    const coverId = draftQuery.data?.draft.cover_asset_id ?? null;
    if (!coverId) return '';
    if (media?.id && media.id === coverId) return media.thumbnail_url || media.public_url || '';
    return '';
  }, [draftQuery.data?.draft.cover_asset_id, media?.id, media?.public_url, media?.thumbnail_url]);

  const previewUrl = useMemo(() => {
    return media?.public_url || media?.thumbnail_url || '';
  }, [media?.public_url, media?.thumbnail_url]);

  const canShowVideo = useMemo(() => {
    if (!previewUrl) return false;
    if (draftType !== 'reel') return false;
    // naive check; web relies on actual URL type
    return true;
  }, [draftType, previewUrl]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Studio Draft
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {saving ? 'Saving…' : lastSavedAt ? 'Saved' : ' '}
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Studio Draft',
              pathTemplate: '/studio/:draftId',
              initialParams: { draftId },
            })
          }
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.primaryBtn]}
          onPress={() => navigation.navigate('PublishDraft', { draftId })}
        >
          <Text style={styles.btnText}>Publish</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        {draftQuery.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
        {draftQuery.isError ? <Text style={[styles.muted, { color: '#ef4444' }]}>Failed to load draft.</Text> : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={{ height: 10 }} />
          <View style={styles.preview}>
            {previewUrl ? (
              canShowVideo ? (
                <Video
                  source={{ uri: previewUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode={ResizeMode.COVER}
                  useNativeControls
                  shouldPlay={false}
                />
              ) : (
                <Image source={{ uri: previewUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              )
            ) : (
              <View style={styles.previewEmpty}>
                <Ionicons name="image-outline" size={26} color="#94a3b8" />
                <Text style={{ color: '#9aa4b2', marginTop: 8, fontWeight: '800' }}>No media attached yet</Text>
                <Text style={{ color: '#6b7280', marginTop: 4, fontSize: 12 }}>Uploads are still web-only for now.</Text>
                <Pressable
                  onPress={() => navigation.navigate('Uploads', { draftId })}
                  style={[styles.smallBtn, { marginTop: 10 }]}
                >
                  <Text style={styles.smallBtnText}>Open uploads</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cover & Aspect</Text>
          <Text style={styles.muted}>Pick a cover image and set aspect ratio (full crop editor is still web-only).</Text>

          <View style={{ height: 10 }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['9:16', '1:1', '4:5', '16:9'] as const).map((v) => (
              <Pressable
                key={v}
                onPress={() => {
                  setAspectRatio(v);
                  scheduleSave({ aspect_ratio: v as any });
                  scheduleSave({ crop_data: { mode: 'center', aspect_ratio: v } as any });
                }}
                style={[styles.chip, aspectRatio === v ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, aspectRatio === v ? styles.chipTextActive : null]}>{v}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => scheduleSave({ crop_data: null as any })} style={styles.chip}>
              <Text style={styles.chipText}>Reset crop</Text>
            </Pressable>
          </View>

          <View style={{ height: 10 }} />
          <Text style={styles.muted}>
            Cover: {draftQuery.data?.draft.cover_asset_id ? draftQuery.data.draft.cover_asset_id.slice(0, 8) : '(not set)'}
          </Text>
          {coverPreviewUrl ? (
            <View style={{ marginTop: 10, height: 140, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
              <Image source={{ uri: coverPreviewUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
          ) : null}

          <View style={{ height: 10 }} />
          <Pressable onPress={() => navigation.navigate('CoverPicker', { draftId })} style={[styles.btn, { alignSelf: 'flex-start' }]}>
            <Text style={styles.btnText}>Choose cover</Text>
          </Pressable>
        </View>

        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Caption</Text>
          <TextInput
            value={caption}
            onChangeText={(v) => {
              setCaption(v);
              scheduleSave({ caption: v });
            }}
            placeholder="Write a caption…"
            placeholderTextColor="#6b7280"
            style={[styles.input, { minHeight: 96, textAlignVertical: 'top' }]}
            multiline
          />
          <Text style={styles.muted}>{caption.length}/2200</Text>
        </View>

        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Hashtags</Text>
          <TextInput
            value={hashtagsText}
            onChangeText={(v) => {
              setHashtagsText(v);
              scheduleSave({ hashtags: normalizeHashtags(v) as any });
            }}
            placeholder="#cocktails #mixology"
            placeholderTextColor="#6b7280"
            autoCapitalize="none"
            style={styles.input}
          />

          <View style={{ height: 12 }} />

          <Text style={styles.sectionTitle}>Location</Text>
          <TextInput
            value={location}
            onChangeText={(v) => {
              setLocation(v);
              scheduleSave({ location: v.trim() ? v : null });
            }}
            placeholder="Optional location…"
            placeholderTextColor="#6b7280"
            style={styles.input}
          />
        </View>

        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Visibility</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {(['public', 'followers', 'private'] as const).map((v) => (
              <Pressable
                key={v}
                onPress={() => {
                  setVisibility(v);
                  scheduleSave({ visibility: v as any });
                }}
                style={[styles.chip, visibility === v ? styles.chipActive : null]}
              >
                <Text style={[styles.chipText, visibility === v ? styles.chipTextActive : null]}>{v}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ height: 12 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Needs approval</Text>
              <Text style={styles.muted}>If enabled, publishing will route to venue/team approval.</Text>
            </View>
            <Switch
              value={needsApproval}
              onValueChange={(v) => {
                setNeedsApproval(v);
                scheduleSave({ needs_approval: v as any });
              }}
            />
          </View>
        </View>

        {draftType === 'reel' ? (
          <>
            <View style={{ height: 12 }} />
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Trim (reels)</Text>
              <View style={{ height: 10 }} />
              <Text style={styles.muted}>Basic trim values only (full editor remains web-only).</Text>

              <View style={{ height: 10 }} />
              <Text style={styles.label}>Trim start (seconds)</Text>
              <TextInput
                value={trimStart}
                onChangeText={(v) => {
                  setTrimStart(v);
                  scheduleSave({ trim_start: toNumberOrNull(v) as any });
                }}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#6b7280"
                style={styles.input}
              />

              <View style={{ height: 10 }} />
              <Text style={styles.label}>Trim end (seconds, optional)</Text>
              <TextInput
                value={trimEnd}
                onChangeText={(v) => {
                  setTrimEnd(v);
                  scheduleSave({ trim_end: toNumberOrNull(v) as any });
                }}
                keyboardType="decimal-pad"
                placeholder=""
                placeholderTextColor="#6b7280"
                style={styles.input}
              />
            </View>
          </>
        ) : null}

        <View style={{ height: 12 }} />

        <Pressable
          onPress={() =>
            Alert.alert('Delete draft?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    const res = await supabase.from('studio_drafts').delete().eq('id', draftId);
                    if (res.error) throw res.error;
                    await queryClient.invalidateQueries({ queryKey: ['studio', 'drafts'] });
                    navigation.goBack();
                  } catch {
                    // ignore
                  }
                },
              },
            ])
          }
          style={[styles.btn, { alignSelf: 'flex-start', borderColor: 'rgba(239,68,68,0.40)', backgroundColor: 'rgba(239,68,68,0.10)' }]}
        >
          <Text style={[styles.btnText, { color: '#fecaca' }]}>Delete draft</Text>
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
    gap: 8,
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
  label: { color: '#9aa4b2', fontSize: 12, fontWeight: '800' },
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
  preview: {
    borderRadius: 16,
    overflow: 'hidden',
    aspectRatio: 9 / 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  previewEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipActive: { backgroundColor: 'rgba(37,99,235,0.20)', borderColor: 'rgba(37,99,235,0.55)' },
  chipText: { color: '#cbd5e1', fontWeight: '800', fontSize: 12, textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
  smallBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  smallBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
});

