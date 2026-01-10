import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { queryClient } from '../lib/queryClient';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type DraftRow = {
  id: string;
  draft_type: 'post' | 'reel' | 'story' | string;
  status: string;
  caption: string | null;
  branch_label: string | null;
  parent_draft_id: string | null;
  updated_at: string;
  created_at: string;
  media_asset?: { thumbnail_url: string | null; public_url: string | null } | { thumbnail_url: string | null; public_url: string | null }[] | null;
};

type DraftItem = Omit<DraftRow, 'media_asset'> & {
  media_asset?: { thumbnail_url: string | null; public_url: string | null } | null;
};

const FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'reels', label: 'Reels' },
  { key: 'posts', label: 'Posts' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'needs_approval', label: 'Pending' },
];

function statusMeta(status: string) {
  switch (status) {
    case 'processing':
      return { label: 'Processing', color: '#f59e0b', icon: 'sync-outline' as const };
    case 'ready':
      return { label: 'Ready', color: '#22c55e', icon: 'checkmark-circle-outline' as const };
    case 'scheduled':
      return { label: 'Scheduled', color: '#60a5fa', icon: 'time-outline' as const };
    case 'needs_approval':
      return { label: 'Needs Approval', color: '#fb923c', icon: 'alert-circle-outline' as const };
    case 'failed':
      return { label: 'Failed', color: '#ef4444', icon: 'close-circle-outline' as const };
    case 'published':
      return { label: 'Published', color: '#a78bfa', icon: 'send-outline' as const };
    default:
      return { label: 'Draft', color: '#94a3b8', icon: 'time-outline' as const };
  }
}

function normalizeMediaAsset(d: DraftRow): DraftItem {
  const raw = d.media_asset ?? null;
  const media_asset = Array.isArray(raw) ? raw[0] ?? null : raw;
  return { ...d, media_asset };
}

export default function DraftsScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const drafts = useQuery({
    queryKey: ['studio', 'drafts', user?.id ?? 'anon', filter],
    queryFn: async (): Promise<DraftItem[]> => {
      if (!user?.id) return [];
      let query = supabase
        .from('studio_drafts')
        .select(
          `
            id, draft_type, status, caption, branch_label, parent_draft_id, updated_at, created_at,
            media_asset:media_assets(thumbnail_url, public_url)
          `,
        )
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (filter !== 'all') {
        if (filter === 'reels') query = query.eq('draft_type', 'reel');
        else if (filter === 'posts') query = query.eq('draft_type', 'post');
        else query = query.eq('status', filter);
      }

      const res = await query;
      if (res.error) throw res.error;
      return (res.data ?? []).map((d) => normalizeMediaAsset(d as unknown as DraftRow));
    },
  });

  const createNewDraft = useMutation({
    mutationFn: async ({ type }: { type: 'post' | 'reel' }) => {
      if (!user?.id) throw new Error('Not signed in');
      const res = await supabase
        .from('studio_drafts')
        .insert({ user_id: user.id, draft_type: type })
        .select('id')
        .single();
      if (res.error) throw res.error;

      // best-effort audit history
      await supabase.from('history_events').insert({
        draft_id: res.data.id,
        user_id: user.id,
        event_type: 'DRAFT_CREATED',
        event_data: { draft_type: type },
      });

      return res.data.id as string;
    },
    onSuccess: async (draftId) => {
      await queryClient.invalidateQueries({ queryKey: ['studio', 'drafts'] });
      navigation.navigate('StudioDraft', { draftId });
    },
  });

  const duplicateDraft = useMutation({
    mutationFn: async ({ draft }: { draft: DraftItem }) => {
      if (!user?.id) throw new Error('Not signed in');
      const res = await supabase
        .from('studio_drafts')
        .insert({
          user_id: user.id,
          draft_type: draft.draft_type,
          caption: draft.caption,
          parent_draft_id: draft.id,
          branch_label: 'Copy',
        })
        .select('id')
        .single();
      if (res.error) throw res.error;
      return res.data.id as string;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['studio', 'drafts'] });
    },
  });

  const deleteDraft = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await supabase.from('studio_drafts').delete().eq('id', id);
      if (res.error) throw res.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['studio', 'drafts'] });
    },
  });

  const filteredDrafts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = drafts.data ?? [];
    if (!q) return list;
    return list.filter((d) => (d.caption ?? '').toLowerCase().includes(q));
  }, [drafts.data, search]);

  const grouped = useMemo(() => {
    const parents: Array<{ parent: DraftItem; branches: DraftItem[] }> = [];
    const byId = new Map<string, DraftItem>();
    for (const d of filteredDrafts) byId.set(d.id, d);
    for (const d of filteredDrafts) if (!d.parent_draft_id) parents.push({ parent: d, branches: [] });
    const parentMap = new Map<string, { parent: DraftItem; branches: DraftItem[] }>();
    for (const p of parents) parentMap.set(p.parent.id, p);
    for (const d of filteredDrafts) {
      if (d.parent_draft_id) {
        const g = parentMap.get(d.parent_draft_id);
        if (g) g.branches.push(d);
      }
    }
    // stable ordering
    for (const g of parents) g.branches.sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''));
    parents.sort((a, b) => (b.parent.updated_at ?? '').localeCompare(a.parent.updated_at ?? ''));
    return parents;
  }, [filteredDrafts]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Drafts
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Studio drafts (native list, web editor)
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() => navigation.navigate('WebRoute', { title: 'Drafts', pathTemplate: '/drafts' })}
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              style={[styles.primaryBtn, (createNewDraft.isPending || duplicateDraft.isPending || deleteDraft.isPending) && { opacity: 0.6 }]}
              onPress={() => createNewDraft.mutate({ type: 'reel' })}
              disabled={createNewDraft.isPending || duplicateDraft.isPending || deleteDraft.isPending}
            >
              <Text style={styles.primaryBtnText}>+ New Reel</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, (createNewDraft.isPending || duplicateDraft.isPending || deleteDraft.isPending) && { opacity: 0.6 }]}
              onPress={() => createNewDraft.mutate({ type: 'post' })}
              disabled={createNewDraft.isPending || duplicateDraft.isPending || deleteDraft.isPending}
            >
              <Text style={styles.primaryBtnText}>+ New Post</Text>
            </Pressable>
          </View>

          <View style={{ height: 10 }} />

          <Text style={styles.sectionTitle}>Search</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search drafts…"
            placeholderTextColor="#6b7280"
            style={styles.input}
            autoCapitalize="none"
          />

          <View style={{ height: 10 }} />

          <Text style={styles.sectionTitle}>Filters</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {FILTERS.map((f) => (
              <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.chip, filter === f.key ? styles.chipActive : null]}>
                <Text style={[styles.chipText, filter === f.key ? styles.chipTextActive : null]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ height: 12 }} />

        {drafts.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
        {drafts.isError ? <Text style={[styles.muted, { color: '#ef4444' }]}>Failed to load drafts.</Text> : null}

        {!drafts.isLoading && filteredDrafts.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>No drafts yet</Text>
            <Text style={styles.muted}>Create a new draft to start. Editing and publishing will open the web editor for now.</Text>
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          {grouped.map(({ parent, branches }) => (
            <View key={parent.id} style={{ gap: 10 }}>
              <DraftCard
                draft={parent}
                onOpen={() =>
                  navigation.navigate('StudioDraft', { draftId: parent.id })
                }
                onPublish={() =>
                  navigation.navigate('WebRoute', {
                    title: 'Publish Draft',
                    pathTemplate: '/publish/:draftId',
                    initialParams: { draftId: parent.id },
                  })
                }
                onDuplicate={() => duplicateDraft.mutate({ draft: parent })}
                onDelete={() =>
                  Alert.alert('Delete draft?', 'This cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteDraft.mutate({ id: parent.id }) },
                  ])
                }
                busy={createNewDraft.isPending || duplicateDraft.isPending || deleteDraft.isPending}
              />

              {branches.length > 0 ? (
                <View style={styles.branchWrap}>
                  {branches.map((b) => (
                    <DraftCard
                      key={b.id}
                      draft={b}
                      isBranch
                      onOpen={() =>
                        navigation.navigate('StudioDraft', { draftId: b.id })
                      }
                      onPublish={() =>
                        navigation.navigate('WebRoute', {
                          title: 'Publish Draft',
                          pathTemplate: '/publish/:draftId',
                          initialParams: { draftId: b.id },
                        })
                      }
                      onDuplicate={() => duplicateDraft.mutate({ draft: b })}
                      onDelete={() =>
                        Alert.alert('Delete draft?', 'This cannot be undone.', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteDraft.mutate({ id: b.id }) },
                        ])
                      }
                      busy={createNewDraft.isPending || duplicateDraft.isPending || deleteDraft.isPending}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function DraftCard({
  draft,
  isBranch,
  onOpen,
  onPublish,
  onDuplicate,
  onDelete,
  busy,
}: {
  draft: DraftItem;
  isBranch?: boolean;
  onOpen: () => void;
  onPublish: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const status = statusMeta(draft.status);
  const img = draft.media_asset?.thumbnail_url || draft.media_asset?.public_url || '';
  const title = (draft.caption ?? '').trim() ? (draft.caption ?? '').trim() : 'Untitled draft';

  return (
    <Pressable style={[styles.item, busy && { opacity: 0.85 }]} onPress={onOpen} disabled={busy}>
      <View style={styles.thumb}>
        {img ? (
          <Image source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons
              name={draft.draft_type === 'reel' ? 'film-outline' : draft.draft_type === 'post' ? 'image-outline' : 'document-text-outline'}
              size={22}
              color="#94a3b8"
            />
          </View>
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isBranch ? <Ionicons name="git-branch-outline" size={14} color="#60a5fa" /> : null}
          <Text style={styles.itemTitle} numberOfLines={1}>
            {title}
            {draft.branch_label ? <Text style={styles.branchLabel}> ({draft.branch_label})</Text> : null}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
          <View style={[styles.badge, { borderColor: `${status.color}55`, backgroundColor: `${status.color}22` }]}>
            <Ionicons name={status.icon} size={14} color={status.color} />
            <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {String(draft.draft_type).toUpperCase()}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            Updated {formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true })}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Pressable onPress={onPublish} style={[styles.smallBtn, busy && { opacity: 0.6 }]} disabled={busy}>
            <Ionicons name="send-outline" size={16} color="#e2e8f0" />
            <Text style={styles.smallBtnText}>Publish</Text>
          </Pressable>
          <Pressable onPress={onDuplicate} style={[styles.smallBtn, busy && { opacity: 0.6 }]} disabled={busy}>
            <Ionicons name="copy-outline" size={16} color="#e2e8f0" />
            <Text style={styles.smallBtnText}>Duplicate</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={[styles.smallBtn, styles.dangerBtn, busy && { opacity: 0.6 }]} disabled={busy}>
            <Ionicons name="trash-outline" size={16} color="#fecaca" />
            <Text style={[styles.smallBtnText, { color: '#fecaca' }]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
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
  secondaryBtn: {},
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
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
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipActive: { backgroundColor: 'rgba(37,99,235,0.20)', borderColor: 'rgba(37,99,235,0.55)' },
  chipText: { color: '#cbd5e1', fontWeight: '800', fontSize: 12 },
  chipTextActive: { color: '#fff' },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(37,99,235,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.55)',
  },
  primaryBtnText: { color: '#e2e8f0', fontWeight: '900' },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  thumb: {
    width: 64,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  thumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { color: '#fff', fontWeight: '900', flexShrink: 1 },
  branchLabel: { color: '#9aa4b2', fontWeight: '800', fontSize: 12 },
  meta: { color: '#9aa4b2', fontSize: 12, fontWeight: '700' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontWeight: '900', fontSize: 12 },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dangerBtn: { borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.10)' },
  smallBtnText: { color: '#e2e8f0', fontWeight: '900', fontSize: 12 },
  branchWrap: { marginLeft: 16, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: 'rgba(37,99,235,0.25)', gap: 10 },
});

