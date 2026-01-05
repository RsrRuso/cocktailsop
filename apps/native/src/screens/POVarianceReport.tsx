import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { usePOReceivedRecordById } from '../features/ops/procurement/queries';

type Nav = { goBack: () => void };

type VarStatus = 'all' | 'match' | 'short' | 'over' | 'missing' | 'extra';

export default function POVarianceReportScreen({ navigation, route }: { navigation: Nav; route: any }) {
  const { user } = useAuth();
  const userId = user?.id;

  const recordId: string = route?.params?.recordId;
  const workspaceId: string | null = route?.params?.workspaceId ?? null;

  const rec = usePOReceivedRecordById(userId, workspaceId, recordId);

  const variance = (rec.data as any)?.variance_data?.variance ?? null;
  const summary = variance?.summary ?? null;
  const items: any[] = variance?.items ?? [];

  const [status, setStatus] = useState<VarStatus>('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter((it) => {
      if (status !== 'all' && it.status !== status) return false;
      if (!query) return true;
      return String(it.item_name ?? '').toLowerCase().includes(query) || String(it.item_code ?? '').toLowerCase().includes(query);
    });
  }, [items, status, q]);

  const titleLine = useMemo(() => {
    const s = rec.data as any;
    if (!s) return '';
    const left = s.supplier_name ?? 'Supplier';
    const mid = s.document_number ? ` • ${s.document_number}` : '';
    const right = s.received_date ? ` • ${s.received_date}` : '';
    return `${left}${mid}${right}`;
  }, [rec.data]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Variance Report
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {titleLine || '—'}
          </Text>
        </View>
        <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => rec.refetch()} disabled={rec.isFetching}>
          <Text style={styles.btnText}>{rec.isFetching ? '…' : 'Refresh'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 10 }}>
        {!variance ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>No variance yet</Text>
            <Text style={styles.muted}>
              Match this received record to a purchase order first to generate variance.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <Text style={styles.muted}>
                Matched: {summary?.matched ?? 0} • Short: {summary?.short ?? 0} • Over: {summary?.over ?? 0} • Missing:{' '}
                {summary?.missing ?? 0} • Extra: {summary?.extra ?? 0}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Filters</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                {(['all', 'match', 'short', 'over', 'missing', 'extra'] as VarStatus[]).map((s) => (
                  <Pressable key={s} onPress={() => setStatus(s)} style={[styles.pill, status === s && styles.pillActive]}>
                    <Text style={styles.pillText}>{s.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput value={q} onChangeText={setQ} placeholder="Search item…" placeholderTextColor="#6b7280" style={styles.search} />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Items ({filtered.length})</Text>
              {filtered.length === 0 ? <Text style={styles.muted}>No items match the filter.</Text> : null}
              <View style={{ gap: 10, marginTop: 10 }}>
                {filtered.map((it, idx) => {
                  const st = String(it.status ?? '');
                  const badgeColor =
                    st === 'match'
                      ? '#22c55e'
                      : st === 'short'
                        ? '#f59e0b'
                        : st === 'over'
                          ? '#3b82f6'
                          : st === 'missing'
                            ? '#ef4444'
                            : '#a855f7';
                  return (
                    <View key={`${it.item_name}-${idx}`} style={styles.row}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                        <Text style={{ color: '#fff', fontWeight: '900', flex: 1 }} numberOfLines={1}>
                          {it.item_name ?? 'Item'}
                        </Text>
                        <Text style={{ color: badgeColor, fontWeight: '900' }}>{st.toUpperCase()}</Text>
                      </View>
                      <Text style={{ color: '#9aa4b2', fontSize: 12, marginTop: 2 }} numberOfLines={2}>
                        Ordered {Number(it.ordered_qty ?? 0)} • Received {Number(it.received_qty ?? 0)} • Δ {Number(it.variance ?? 0)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}
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
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  sectionTitle: { color: '#fff', fontWeight: '900' },
  muted: { color: '#9aa4b2', marginTop: 8, fontSize: 12, lineHeight: 18 },
  row: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pillActive: { borderColor: 'rgba(59,130,246,0.55)', backgroundColor: 'rgba(59,130,246,0.16)' },
  pillText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  search: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});

