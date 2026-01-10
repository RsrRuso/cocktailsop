import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { queryClient } from '../lib/queryClient';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type ApprovalComment = { id: string; content: string; created_at: string; user_id: string };

type ApprovalRequest = {
  id: string;
  status: string;
  feedback: string | null;
  created_at: string;
  user_id: string;
  venue_id: string | null;
  draft: { id: string; draft_type: string; caption: string | null } | null;
  comments: ApprovalComment[];
};

const FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'changes_requested', label: 'Changes' },
];

function statusMeta(status: string) {
  switch (status) {
    case 'approved':
      return { label: 'Approved', color: '#22c55e', icon: 'checkmark-circle-outline' as const };
    case 'rejected':
      return { label: 'Rejected', color: '#ef4444', icon: 'close-circle-outline' as const };
    case 'changes_requested':
      return { label: 'Changes', color: '#fb923c', icon: 'alert-circle-outline' as const };
    default:
      return { label: 'Pending', color: '#f59e0b', icon: 'time-outline' as const };
  }
}

export default function ApprovalsScreen({
  navigation,
  route,
}: {
  navigation: Nav;
  route?: { params?: { venueId?: string } };
}) {
  const { user } = useAuth();
  const venueId = route?.params?.venueId;

  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ApprovalRequest | null>(null);
  const [decisionFeedback, setDecisionFeedback] = useState('');
  const [newComment, setNewComment] = useState('');

  const requests = useQuery({
    queryKey: ['studio', 'approvals', user?.id ?? 'anon', venueId ?? 'all'],
    queryFn: async (): Promise<ApprovalRequest[]> => {
      if (!user?.id) return [];
      let q = supabase
        .from('studio_approval_requests')
        .select(
          `
          id, status, feedback, created_at, user_id, venue_id,
          draft:studio_drafts(id, draft_type, caption),
          comments:approval_comments(id, content, created_at, user_id)
        `,
        )
        .order('created_at', { ascending: false });
      if (venueId) q = q.eq('venue_id', venueId);
      const res = await q;
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as ApprovalRequest[];
    },
  });

  const filtered = useMemo(() => {
    const list = requests.data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (!q) return true;
      const cap = (r.draft?.caption ?? '').toLowerCase();
      return cap.includes(q) || r.id.toLowerCase().includes(q);
    });
  }, [requests.data, search, filter]);

  const decide = useMutation({
    mutationFn: async ({ requestId, decision, feedback }: { requestId: string; decision: 'approved' | 'rejected' | 'changes_requested'; feedback: string }) => {
      if (!user?.id) throw new Error('Not signed in');
      const upd = await supabase
        .from('studio_approval_requests')
        .update({
          status: decision,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          feedback: feedback.trim() ? feedback.trim() : null,
        })
        .eq('id', requestId);
      if (upd.error) throw upd.error;

      const req = (requests.data ?? []).find((r) => r.id === requestId);
      if (req?.draft?.id) {
        await supabase.from('history_events').insert({
          draft_id: req.draft.id,
          user_id: user.id,
          event_type: decision === 'approved' ? 'APPROVED' : decision === 'rejected' ? 'REJECTED' : 'CHANGES_REQUESTED',
          event_data: { feedback: feedback.trim() ? feedback.trim() : '' },
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['studio', 'approvals'] });
    },
    onError: (e: any) => {
      Alert.alert('Failed', e?.message ?? 'Unable to update request');
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ requestId, content }: { requestId: string; content: string }) => {
      if (!user?.id) throw new Error('Not signed in');
      const c = content.trim();
      if (!c) return;
      const ins = await supabase.from('approval_comments').insert({
        approval_request_id: requestId,
        user_id: user.id,
        content: c,
      });
      if (ins.error) throw ins.error;
    },
    onSuccess: async () => {
      setNewComment('');
      await queryClient.invalidateQueries({ queryKey: ['studio', 'approvals'] });
    },
    onError: (e: any) => {
      Alert.alert('Failed', e?.message ?? 'Unable to add comment');
    },
  });

  const busy = decide.isPending || addComment.isPending;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Approval Inbox
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Review content submissions
          </Text>
        </View>
        <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => navigation.navigate('WebRoute', { title: 'Approvals', pathTemplate: '/approvals' })}>
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Search</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search caption or id…"
            placeholderTextColor="#6b7280"
            autoCapitalize="none"
            style={styles.input}
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

        {requests.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
        {requests.isError ? <Text style={[styles.muted, { color: '#ef4444' }]}>Failed to load requests.</Text> : null}

        {!requests.isLoading && filtered.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>All caught up</Text>
            <Text style={styles.muted}>No matching approval requests.</Text>
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          {filtered.map((r) => {
            const s = statusMeta(r.status);
            const type = (r.draft?.draft_type ?? '').toLowerCase();
            return (
              <Pressable key={r.id} style={styles.item} onPress={() => { setSelected(r); setDecisionFeedback(''); setNewComment(''); }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.iconBox}>
                    <Ionicons name={type === 'reel' ? 'film-outline' : 'image-outline'} size={18} color="#9aa4b2" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {r.draft?.caption?.trim() ? r.draft.caption.trim() : 'No caption'}
                    </Text>
                    <Text style={styles.itemSub} numberOfLines={1}>
                      {type || 'draft'} • {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      {r.comments?.length ? ` • ${r.comments.length} comments` : ''}
                    </Text>
                  </View>
                  <View style={[styles.badge, { borderColor: `${s.color}55`, backgroundColor: `${s.color}22` }]}>
                    <Ionicons name={s.icon} size={14} color={s.color} />
                    <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.modalTitle}>Review submission</Text>
              <Pressable onPress={() => setSelected(null)} style={styles.modalClose}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>×</Text>
              </Pressable>
            </View>

            {selected ? (
              <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
                <View style={{ height: 10 }} />
                <Text style={styles.label}>Caption</Text>
                <Text style={styles.captionText}>{selected.draft?.caption?.trim() ? selected.draft.caption.trim() : 'No caption'}</Text>

                {selected.feedback ? (
                  <>
                    <View style={{ height: 10 }} />
                    <Text style={styles.label}>Existing feedback</Text>
                    <Text style={styles.captionText}>{selected.feedback}</Text>
                  </>
                ) : null}

                <View style={{ height: 12 }} />
                <Text style={styles.label}>Decision feedback (optional)</Text>
                <TextInput
                  value={decisionFeedback}
                  onChangeText={setDecisionFeedback}
                  placeholder="Write feedback…"
                  placeholderTextColor="#6b7280"
                  style={[styles.input, { minHeight: 84, textAlignVertical: 'top' }]}
                  multiline
                />

                <View style={{ height: 12 }} />
                <Text style={styles.label}>Comments</Text>
                <View style={{ gap: 8, marginTop: 8 }}>
                  {(selected.comments ?? []).length === 0 ? <Text style={styles.muted}>No comments yet.</Text> : null}
                  {(selected.comments ?? []).map((c) => (
                    <View key={c.id} style={styles.comment}>
                      <Text style={styles.commentBody}>{c.content}</Text>
                      <Text style={styles.commentMeta}>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</Text>
                    </View>
                  ))}
                </View>

                <View style={{ height: 10 }} />
                <TextInput
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder="Add a comment…"
                  placeholderTextColor="#6b7280"
                  style={styles.input}
                />
                <Pressable
                  style={[styles.smallBtn, busy && { opacity: 0.6 }]}
                  disabled={busy}
                  onPress={() => addComment.mutate({ requestId: selected.id, content: newComment })}
                >
                  <Text style={styles.smallBtnText}>Add comment</Text>
                </Pressable>

                <View style={{ height: 12 }} />

                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Pressable
                    style={[styles.actionBtn, { borderColor: 'rgba(34,197,94,0.55)', backgroundColor: 'rgba(34,197,94,0.15)' }, busy && { opacity: 0.6 }]}
                    disabled={busy}
                    onPress={() => decide.mutate({ requestId: selected.id, decision: 'approved', feedback: decisionFeedback })}
                  >
                    <Text style={styles.actionText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, { borderColor: 'rgba(251,146,60,0.55)', backgroundColor: 'rgba(251,146,60,0.12)' }, busy && { opacity: 0.6 }]}
                    disabled={busy}
                    onPress={() => decide.mutate({ requestId: selected.id, decision: 'changes_requested', feedback: decisionFeedback })}
                  >
                    <Text style={styles.actionText}>Request changes</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, { borderColor: 'rgba(239,68,68,0.55)', backgroundColor: 'rgba(239,68,68,0.12)' }, busy && { opacity: 0.6 }]}
                    disabled={busy}
                    onPress={() =>
                      Alert.alert('Reject submission?', 'This will mark the request as rejected.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Reject', style: 'destructive', onPress: () => decide.mutate({ requestId: selected.id, decision: 'rejected', feedback: decisionFeedback }) },
                      ])
                    }
                  >
                    <Text style={styles.actionText}>Reject</Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
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
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    maxHeight: '92%',
    backgroundColor: '#0b1220',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  modalTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  label: { color: '#9aa4b2', fontWeight: '900', fontSize: 12 },
  captionText: { color: '#e2e8f0', marginTop: 6, lineHeight: 20 },
  comment: { padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.03)' },
  commentBody: { color: '#e2e8f0', fontWeight: '700' },
  commentMeta: { color: '#9aa4b2', fontSize: 11, marginTop: 6, fontWeight: '800' },
  smallBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  smallBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  actionText: { color: '#fff', fontWeight: '900' },
});

