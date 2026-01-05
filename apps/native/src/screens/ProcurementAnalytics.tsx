import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useProcurementWorkspaces } from '../features/ops/procurement/queries';
import { usePoPriceHistory, useProcurementOverview } from '../features/ops/procurement/analytics';

type Nav = { goBack: () => void };

export default function ProcurementAnalyticsScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();
  const userId = user?.id;

  const workspaces = useProcurementWorkspaces(userId);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const overview = useProcurementOverview(userId, workspaceId);
  const prices = usePoPriceHistory(userId, workspaceId);

  const [tab, setTab] = useState<'overview' | 'prices'>('overview');
  const [q, setQ] = useState('');

  const filteredPrices = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = prices.data ?? [];
    if (!query) return list;
    return list.filter((p) => p.item_name.toLowerCase().includes(query));
  }, [prices.data, q]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Procurement Analytics
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {workspaceId ? 'Workspace' : 'Personal'} • Native
          </Text>
        </View>
        <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => { overview.refetch(); prices.refetch(); }} disabled={overview.isFetching || prices.isFetching}>
          <Text style={styles.btnText}>{overview.isFetching || prices.isFetching ? '…' : 'Refresh'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 10 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Workspace</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <Pressable style={[styles.btn, !workspaceId ? styles.primaryBtn : styles.secondaryBtn]} onPress={() => setWorkspaceId(null)}>
              <Text style={styles.btnText}>Personal</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => workspaces.refetch()} disabled={workspaces.isFetching}>
              <Text style={styles.btnText}>{workspaces.isFetching ? '…' : 'Reload'}</Text>
            </Pressable>
          </View>
          <View style={{ gap: 8, marginTop: 10 }}>
            {(workspaces.data ?? []).map((w) => (
              <Pressable
                key={w.id}
                style={[styles.wsRow, w.id === workspaceId && { borderColor: 'rgba(59,130,246,0.55)' }]}
                onPress={() => setWorkspaceId(w.id)}
              >
                <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                  {w.name}
                </Text>
                <Text style={{ color: '#9aa4b2', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {w.description || '—'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.tabs}>
          {(['overview', 'prices'] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
              <Text style={styles.tabText}>{t.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'overview' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Overview</Text>
            {overview.isLoading ? (
              <Text style={styles.muted}>Loading…</Text>
            ) : (
              <>
                <View style={styles.kpiRow}>
                  <View style={styles.kpi}>
                    <Text style={styles.kpiLabel}>Purchase orders</Text>
                    <Text style={styles.kpiValue}>{overview.data?.purchaseOrdersCount ?? 0}</Text>
                  </View>
                  <View style={styles.kpi}>
                    <Text style={styles.kpiLabel}>PO total</Text>
                    <Text style={styles.kpiValue}>{Number(overview.data?.purchaseOrdersTotal ?? 0).toFixed(2)}</Text>
                  </View>
                </View>
                <View style={styles.kpiRow}>
                  <View style={styles.kpi}>
                    <Text style={styles.kpiLabel}>Received records</Text>
                    <Text style={styles.kpiValue}>{overview.data?.receivedRecordsCount ?? 0}</Text>
                  </View>
                  <View style={styles.kpi}>
                    <Text style={styles.kpiLabel}>Received total</Text>
                    <Text style={styles.kpiValue}>{Number(overview.data?.receivedTotal ?? 0).toFixed(2)}</Text>
                  </View>
                </View>
                <Text style={styles.muted}>Last received: {overview.data?.lastReceivedDate ?? '—'}</Text>
              </>
            )}
          </View>
        ) : null}

        {tab === 'prices' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Price history</Text>
            <TextInput value={q} onChangeText={setQ} placeholder="Search item…" placeholderTextColor="#6b7280" style={styles.search} />
            {prices.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
            {filteredPrices.length === 0 && !prices.isLoading ? <Text style={styles.muted}>No price changes.</Text> : null}
            <View style={{ gap: 10, marginTop: 10 }}>
              {filteredPrices.map((p) => (
                <View key={p.id} style={styles.row}>
                  <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                    {p.item_name}
                  </Text>
                  <Text style={{ color: '#9aa4b2', fontSize: 12, marginTop: 2 }} numberOfLines={2}>
                    {p.previous_price != null ? `${Number(p.previous_price).toFixed(2)} → ` : '— → '}
                    {Number(p.current_price).toFixed(2)}
                    {p.change_pct != null ? ` • ${Number(p.change_pct).toFixed(1)}%` : ''}
                  </Text>
                  <Text style={styles.muted}>{new Date(p.changed_at).toLocaleString()}</Text>
                </View>
              ))}
            </View>
          </View>
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
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  sectionTitle: { color: '#fff', fontWeight: '900' },
  muted: { color: '#9aa4b2', marginTop: 8, fontSize: 12, lineHeight: 18 },
  wsRow: {
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
    flex: 1,
  },
  primaryBtn: { backgroundColor: 'rgba(59,130,246,0.35)', borderColor: 'rgba(59,130,246,0.55)' },
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  tabs: { flexDirection: 'row', gap: 10 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  tabActive: { borderColor: 'rgba(59,130,246,0.55)', backgroundColor: 'rgba(59,130,246,0.16)' },
  tabText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  kpiRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  kpi: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  kpiLabel: { color: '#9aa4b2', fontSize: 12 },
  kpiValue: { color: '#fff', fontWeight: '900', fontSize: 18, marginTop: 6 },
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
  row: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});

