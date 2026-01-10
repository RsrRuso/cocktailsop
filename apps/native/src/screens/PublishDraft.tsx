import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
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
  approval_venue_id: string | null;
  scheduled_at: string | null;
};

type MediaAssetRow = {
  status: string | null;
  public_url: string | null;
  thumbnail_url: string | null;
};

function normalizeMediaAsset(m: MediaAssetRow | MediaAssetRow[] | null | undefined) {
  if (!m) return null;
  return Array.isArray(m) ? m[0] ?? null : m;
}

function computeScheduledAt(date: string, time: string) {
  const d = date.trim();
  const t = time.trim();
  if (!d || !t) return null;
  const dt = new Date(`${d}T${t}`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

export default function PublishDraftScreen({
  navigation,
  route,
}: {
  navigation: Nav;
  route: { params: { draftId: string } };
}) {
  const { user } = useAuth();
  const draftId = route.params.draftId;

  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [approvalVenueId, setApprovalVenueId] = useState('');

  const dataQuery = useQuery({
    queryKey: ['studio', 'publish', draftId],
    queryFn: async () => {
      const res = await supabase
        .from('studio_drafts')
        .select(
          `
          id, draft_type, status, caption, hashtags, location, visibility, needs_approval, approval_venue_id, scheduled_at,
          media_asset:media_assets(status, public_url, thumbnail_url)
        `,
        )
        .eq('id', draftId)
        .single();
      if (res.error) throw res.error;

      return {
        draft: res.data as unknown as DraftRow,
        media: normalizeMediaAsset((res.data as any)?.media_asset as any) as MediaAssetRow | null,
      };
    },
  });

  const draft = dataQuery.data?.draft;
  const media = dataQuery.data?.media;

  const mediaPreviewUrl = useMemo(() => media?.thumbnail_url || media?.public_url || '', [media?.public_url, media?.thumbnail_url]);

  const canPublish = useMemo(() => {
    if (!draft) return false;
    if (!(draft.caption ?? '').trim()) return false;
    if (media?.status && media.status !== 'ready') return false;
    return true;
  }, [draft, media?.status]);

  const publish = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not signed in');
      if (!draft) throw new Error('Draft not loaded');
      if (!(draft.caption ?? '').trim()) throw new Error('Please add a caption');
      if (media?.status && media.status !== 'ready') throw new Error('Media is still processing');

      // If approval needed, request approval and exit.
      if (draft.needs_approval) {
        const venueId = (approvalVenueId.trim() || draft.approval_venue_id || null) as string | null;
        const ins = await supabase.from('studio_approval_requests').insert({
          draft_id: draft.id,
          user_id: user.id,
          venue_id: venueId,
          status: 'pending',
        });
        if (ins.error) throw ins.error;

        const upd = await supabase.from('studio_drafts').update({ status: 'needs_approval' }).eq('id', draft.id);
        if (upd.error) throw upd.error;

        await supabase.from('history_events').insert({
          draft_id: draft.id,
          user_id: user.id,
          event_type: 'APPROVAL_REQUESTED',
        });

        return { mode: 'approval' as const };
      }

      // Schedule or publish now
      if (scheduleMode) {
        const scheduledAt = computeScheduledAt(scheduleDate, scheduleTime);
        if (!scheduledAt) throw new Error('Enter schedule date and time');

        const upd = await supabase
          .from('studio_drafts')
          .update({ status: 'scheduled', scheduled_at: scheduledAt.toISOString() })
          .eq('id', draft.id);
        if (upd.error) throw upd.error;

        await supabase.from('history_events').insert({
          draft_id: draft.id,
          user_id: user.id,
          event_type: 'SCHEDULED',
          event_data: { scheduled_at: scheduledAt.toISOString() },
        });

        return { mode: 'scheduled' as const };
      }

      // Publish now (same as web)
      const draftType = (draft.draft_type ?? '').toLowerCase();
      const visibility = (draft.visibility ?? 'public') as any;
      const hashtags = draft.hashtags ?? [];

      if (draftType === 'reel') {
        const createReel = await supabase
          .from('reels')
          .insert({
            user_id: user.id,
            video_url: media?.public_url ?? null,
            thumbnail_url: media?.thumbnail_url ?? null,
            caption: draft.caption,
            hashtags,
            visibility,
          })
          .select()
          .single();
        if (createReel.error) throw createReel.error;

        const reelId = createReel.data.id as string;

        const pv = await supabase.from('post_versions').insert({
          reel_id: reelId,
          version_number: 1,
          caption: draft.caption,
          hashtags,
          status: 'ready',
        });
        if (pv.error) throw pv.error;

        await supabase.from('history_events').insert([{ draft_id: draft.id, reel_id: reelId, user_id: user.id, event_type: 'PUBLISHED', version_number: 1 }]);

        const upd = await supabase.from('studio_drafts').update({ status: 'published' }).eq('id', draft.id);
        if (upd.error) throw upd.error;

        return { mode: 'published_reel' as const };
      }

      // post (default)
      const createPost = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          image_url: media?.public_url ?? null,
          caption: draft.caption,
          hashtags,
          visibility,
        })
        .select()
        .single();
      if (createPost.error) throw createPost.error;

      const postId = createPost.data.id as string;

      const pv = await supabase.from('post_versions').insert({
        post_id: postId,
        version_number: 1,
        caption: draft.caption,
        hashtags,
        status: 'ready',
      });
      if (pv.error) throw pv.error;

      await supabase.from('history_events').insert([{ draft_id: draft.id, post_id: postId, user_id: user.id, event_type: 'PUBLISHED', version_number: 1 }]);

      const upd = await supabase.from('studio_drafts').update({ status: 'published' }).eq('id', draft.id);
      if (upd.error) throw upd.error;

      return { mode: 'published_post' as const };
    },
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ['studio', 'drafts'] });
      await queryClient.invalidateQueries({ queryKey: ['studio', 'publish', draftId] });

      if (res.mode === 'approval') {
        Alert.alert('Submitted for approval', 'Your draft was submitted for approval.');
        navigation.navigate('Drafts');
        return;
      }
      if (res.mode === 'scheduled') {
        Alert.alert('Scheduled', 'Your draft is scheduled.');
        navigation.navigate('Drafts');
        return;
      }
      if (res.mode === 'published_reel') {
        Alert.alert('Published', 'Reel published!');
        navigation.navigate('Reels');
        return;
      }
      Alert.alert('Published', 'Post published!');
      navigation.navigate('Tabs');
    },
    onError: (e: any) => {
      Alert.alert('Publish failed', e?.message ?? 'Unknown error');
    },
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Publish
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Draft {draftId.slice(0, 8)}
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Publish Draft',
              pathTemplate: '/publish/:draftId',
              initialParams: { draftId },
            })
          }
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        {dataQuery.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
        {dataQuery.isError ? <Text style={[styles.muted, { color: '#ef4444' }]}>Failed to load draft.</Text> : null}

        {draft ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Preview</Text>
              <View style={{ height: 10 }} />
              <View style={styles.preview}>
                {mediaPreviewUrl ? (
                  <Image source={{ uri: mediaPreviewUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <View style={styles.previewEmpty}>
                    <Ionicons name="image-outline" size={26} color="#94a3b8" />
                    <Text style={{ color: '#9aa4b2', marginTop: 8, fontWeight: '800' }}>No media</Text>
                    <Text style={{ color: '#6b7280', marginTop: 4, fontSize: 12 }}>Attach media via Studio/Uploads (web) for now.</Text>
                  </View>
                )}
              </View>

              <View style={{ height: 10 }} />
              <Text style={styles.muted}>
                {media?.status ? `Media status: ${media.status}` : 'Media status: (none)'} • Type: {draft.draft_type}
              </Text>
            </View>

            <View style={{ height: 12 }} />

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Checks</Text>
              <View style={{ height: 10 }} />
              <Text style={styles.muted}>Caption required. Media must be ready (if present).</Text>
              {!canPublish ? <Text style={[styles.muted, { color: '#fb923c' }]}>Fix issues above before publishing.</Text> : null}
            </View>

            <View style={{ height: 12 }} />

            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.sectionTitle}>Schedule</Text>
                <Pressable
                  onPress={() => setScheduleMode((v) => !v)}
                  style={[styles.chip, scheduleMode ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipText, scheduleMode ? styles.chipTextActive : null]}>{scheduleMode ? 'On' : 'Off'}</Text>
                </Pressable>
              </View>

              {scheduleMode ? (
                <>
                  <Text style={styles.muted}>Date: YYYY-MM-DD • Time: HH:MM (24h)</Text>
                  <TextInput
                    value={scheduleDate}
                    onChangeText={setScheduleDate}
                    placeholder="2026-01-10"
                    placeholderTextColor="#6b7280"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                  <TextInput
                    value={scheduleTime}
                    onChangeText={setScheduleTime}
                    placeholder="14:30"
                    placeholderTextColor="#6b7280"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </>
              ) : null}
            </View>

            <View style={{ height: 12 }} />

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Approval</Text>
              <Text style={styles.muted}>If “Needs approval” is enabled on the draft, publishing submits an approval request.</Text>
              <TextInput
                value={approvalVenueId}
                onChangeText={setApprovalVenueId}
                placeholder="Optional approval venue id (UUID)"
                placeholderTextColor="#6b7280"
                autoCapitalize="none"
                style={styles.input}
              />
            </View>

            <View style={{ height: 12 }} />

            <Pressable
              onPress={() => publish.mutate()}
              disabled={!canPublish || publish.isPending}
              style={[
                styles.primaryBtn,
                (!canPublish || publish.isPending) && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.primaryBtnText}>{publish.isPending ? 'Working…' : draft.needs_approval ? 'Submit for approval' : scheduleMode ? 'Schedule' : 'Publish now'}</Text>
            </Pressable>
          </>
        ) : null}
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
  chipText: { color: '#cbd5e1', fontWeight: '900', fontSize: 12 },
  chipTextActive: { color: '#fff' },
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

