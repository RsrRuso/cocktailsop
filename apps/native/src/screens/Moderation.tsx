import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type FlaggedContent = {
  id: string;
  content_type: 'post' | 'reel' | 'story';
  content_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'removed' | 'restricted';
  created_at: string;
  content?: { caption?: string; media_url?: string; user_id: string };
};

const MOCK_DATA: FlaggedContent[] = [
  {
    id: '1',
    content_type: 'reel',
    content_id: 'reel-1',
    reason: 'Inappropriate content',
    status: 'pending',
    created_at: new Date().toISOString(),
    content: { caption: 'Sample flagged content', media_url: '', user_id: 'user-1' },
  },
];

function statusMeta(status: FlaggedContent['status']) {
  switch (status) {
    case 'approved':
      return { label: 'Approved', color: '#22c55e', icon: 'checkmark-circle-outline' as const };
    case 'removed':
      return { label: 'Removed', color: '#ef4444', icon: 'close-circle-outline' as const };
    case 'restricted':
      return { label: 'Restricted', color: '#fb923c', icon: 'warning-outline' as const };
    default:
      return { label: 'Pending Review', color: '#f59e0b', icon: 'time-outline' as const };
  }
}

export default function ModerationScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [items, setItems] = useState<FlaggedContent[]>(MOCK_DATA);
  const [selected, setSelected] = useState<FlaggedContent | null>(null);
  const [feedback, setFeedback] = useState('');

  const visible = useMemo(() => {
    const list = items;
    if (filter === 'pending') return list.filter((i) => i.status === 'pending');
    return list;
  }, [filter, items]);

  const decide = useMutation({
    mutationFn: async ({ item, decision, feedbackText }: { item: FlaggedContent; decision: 'approved' | 'removed' | 'restricted'; feedbackText: string }) => {
      // NOTE: web app currently uses mock data; in production this should update a content_flags table.
      await supabase.from('history_events').insert({
        user_id: user?.id,
        event_type: decision === 'approved' ? 'MODERATION_CLEAR' : 'MODERATION_FLAG',
        event_data: {
          content_type: item.content_type,
          content_id: item.content_id,
          decision,
          feedback: feedbackText,
        },
      });
    },
    onSuccess: (_data, vars) => {
      // Update local mock state to mirror "moderated"
      setItems((prev) => prev.map((p) => (p.id === vars.item.id ? { ...p, status: vars.decision as any } : p)));
      setSelected(null);
      setFeedback('');
    },
    onError: (e: any) => Alert.alert('Failed', e?.message ?? 'Unable to process moderation'),
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Moderation
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Review flagged content (mock queue)
          </Text>
        </View>
        <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => navigation.navigate('WebRoute', { title: 'Moderation', pathTemplate: '/moderation' })}>
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Filters</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {(['pending', 'all'] as const).map((k) => (
              <Pressable key={k} onPress={() => setFilter(k)} style={[styles.chip, filter === k ? styles.chipActive : null]}>
                <Text style={[styles.chipText, filter === k ? styles.chipTextActive : null]}>{k}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.muted}>Web currently uses mock data (no content_flags table yet). This mirrors that behavior.</Text>
        </View>

        <View style={{ height: 12 }} />

        {visible.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>No items to review</Text>
            <Text style={styles.muted}>All content has been moderated.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {visible.map((it) => {
              const s = statusMeta(it.status);
              return (
                <Pressable key={it.id} style={styles.item} onPress={() => setSelected(it)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={styles.iconBox}>
                      <Ionicons name={it.content_type === 'reel' ? 'film-outline' : 'image-outline'} size={18} color="#9aa4b2" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {it.content_type.toUpperCase()} • {it.reason}
                      </Text>
                      <Text style={styles.itemSub} numberOfLines={2}>
                        {it.content?.caption ?? 'No caption'}
                      </Text>
                      <Text style={styles.itemSub} numberOfLines={1}>
                        {formatDistanceToNow(new Date(it.created_at), { addSuffix: true })}
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
        )}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.modalTitle}>Review content</Text>
              <Pressable onPress={() => setSelected(null)} style={styles.modalClose}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>×</Text>
              </Pressable>
            </View>

            {selected ? (
              <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
                <View style={{ height: 10 }} />
                <Text style={styles.label}>Reason</Text>
                <Text style={styles.captionText}>{selected.reason}</Text>

                <View style={{ height: 10 }} />
                <Text style={styles.label}>Caption</Text>
                <Text style={styles.captionText}>{selected.content?.caption ?? 'No caption'}</Text>

                {selected.status === 'pending' ? (
                  <>
                    <View style={{ height: 12 }} />
                    <Text style={styles.label}>Feedback (optional)</Text>
                    <TextInput
                      value={feedback}
                      onChangeText={setFeedback}
                      placeholder="Add feedback for creator…"
                      placeholderTextColor="#6b7280"
                      style={[styles.input, { minHeight: 84, textAlignVertical: 'top' }]}
                      multiline
                    />
                  </>
                ) : null}

                <View style={{ height: 12 }} />
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Pressable
                    style={[styles.actionBtn, { borderColor: 'rgba(34,197,94,0.55)', backgroundColor: 'rgba(34,197,94,0.15)' }, decide.isPending && { opacity: 0.6 }]}
                    disabled={decide.isPending}
                    onPress={() => decide.mutate({ item: selected, decision: 'approved', feedbackText: feedback })}
                  >
                    <Text style={styles.actionText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, { borderColor: 'rgba(251,146,60,0.55)', backgroundColor: 'rgba(251,146,60,0.12)' }, decide.isPending && { opacity: 0.6 }]}
                    disabled={decide.isPending}
                    onPress={() => decide.mutate({ item: selected, decision: 'restricted', feedbackText: feedback })}
                  >
                    <Text style={styles.actionText}>Restrict</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, { borderColor: 'rgba(239,68,68,0.55)', backgroundColor: 'rgba(239,68,68,0.12)' }, decide.isPending && { opacity: 0.6 }]}
                    disabled={decide.isPending}
                    onPress={() =>
                      Alert.alert('Remove content?', 'This marks it as removed (mock).', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Remove', style: 'destructive', onPress: () => decide.mutate({ item: selected, decision: 'removed', feedbackText: feedback }) },
                      ])
                    }
                  >
                    <Text style={styles.actionText}>Remove</Text>
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
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipActive: { backgroundColor: 'rgba(37,99,235,0.20)', borderColor: 'rgba(37,99,235,0.55)' },
  chipText: { color: '#cbd5e1', fontWeight: '900', fontSize: 12, textTransform: 'capitalize' },
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
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  actionText: { color: '#fff', fontWeight: '900' },
});

