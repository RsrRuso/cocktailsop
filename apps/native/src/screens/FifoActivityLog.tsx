import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFifoWorkspaceActivity } from '../features/ops/workspaces/queries';

type Nav = { goBack: () => void };

function stringifyDetails(details: any): string {
  if (!details) return '';
  if (typeof details === 'string') return details;
  try {
    const keys = ['item_name', 'name', 'store_name', 'from_store', 'to_store', 'quantity', 'received_quantity', 'transfer_quantity'];
    for (const k of keys) {
      if (details?.[k] && typeof details[k] === 'string') return details[k];
    }
    return JSON.stringify(details);
  } catch {
    return '';
  }
}

export default function FifoActivityLogScreen({
  navigation,
  route,
}: {
  navigation: Nav;
  route: any;
}) {
  const workspaceId: string | undefined = route?.params?.workspaceId;
  const title: string | undefined = route?.params?.title;

  const { data, isLoading, refetch } = useFifoWorkspaceActivity(workspaceId);

  const rows = useMemo(() => data ?? [], [data]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Activity Log
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {title ? title : workspaceId ? workspaceId : 'No workspace selected'}
          </Text>
        </View>
        <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        {!workspaceId ? (
          <Text style={styles.muted}>No workspace selected.</Text>
        ) : isLoading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : rows.length === 0 ? (
          <Text style={styles.muted}>No activity yet.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {rows.map((r) => {
              const details = stringifyDetails(r.details);
              const qty =
                r.quantity_before != null && r.quantity_after != null ? `${r.quantity_before} → ${r.quantity_after}` : '';
              return (
                <View key={r.id} style={styles.card}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {r.action_type}
                  </Text>
                  {details ? (
                    <Text style={styles.cardSub} numberOfLines={2}>
                      {details}
                    </Text>
                  ) : null}
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {r.created_at ?? '—'}
                    {qty ? ` • ${qty}` : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ marginTop: 14 }}>
          <Text style={styles.note}>
            Need approvals / PIN / QR scan? Use “Open web” from the workspace list (WebView fallback) until those flows are ported
            natively.
          </Text>
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
  refreshBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  refreshText: { color: '#fff', fontWeight: '700' },
  muted: { color: '#9aa4b2', padding: 12 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  cardTitle: { color: '#fff', fontWeight: '800', fontSize: 14 },
  cardSub: { color: '#9aa4b2', marginTop: 4, fontSize: 12 },
  cardMeta: { color: '#9aa4b2', marginTop: 6, fontSize: 12 },
  note: { color: '#9aa4b2', fontSize: 12, lineHeight: 18 },
});

