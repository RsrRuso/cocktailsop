import React from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useFifoActivity, useFifoTransfers } from '../features/ops/inventory/queries';

export default function InventoryTransactionsScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const transfers = useFifoTransfers(user?.id);
  const activity = useFifoActivity(user?.id);

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Inventory Transactions</Text>
            <Text style={styles.sub}>Transfers + activity log (FIFO).</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('WebRoute', { title: 'Inventory Transactions (Web)', pathTemplate: '/inventory-transactions' })} style={styles.webBtn}>
            <Text style={styles.webBtnText}>Open web</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 12 }}>
        <Text style={styles.sectionTitle}>Recent transfers</Text>
        {transfers.isLoading ? <Text style={{ color: '#9aa4b2' }}>Loading…</Text> : null}
        {(transfers.data ?? []).slice(0, 30).map((t) => (
          <View key={t.id} style={styles.card}>
            <Text style={{ color: '#fff', fontWeight: '900' }}>
              {t.inventory?.items?.name ?? 'Item'} {t.inventory?.items?.brand ? `(${t.inventory.items.brand})` : ''}
            </Text>
            <Text style={{ color: '#9aa4b2', marginTop: 2 }}>
              {t.from_store?.name ?? 'From'} → {t.to_store?.name ?? 'To'} • Qty {t.quantity}
            </Text>
            <Text style={{ color: '#64748b', marginTop: 6, fontSize: 12 }}>
              {t.employees?.name ?? 'Staff'} • {new Date(t.transfer_date ?? t.created_at).toLocaleString()}
            </Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Recent activity</Text>
        {activity.isLoading ? <Text style={{ color: '#9aa4b2' }}>Loading…</Text> : null}
        {(activity.data ?? []).slice(0, 40).map((a) => (
          <View key={a.id} style={styles.card}>
            <Text style={{ color: '#fff', fontWeight: '900' }}>{a.action_type}</Text>
            <Text style={{ color: '#9aa4b2', marginTop: 2 }}>
              {a.stores?.name ?? 'Store'} • {a.employees?.name ?? 'Staff'}
            </Text>
            <Text style={{ color: '#64748b', marginTop: 6, fontSize: 12 }}>{new Date(a.created_at).toLocaleString()}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1220' },
  top: { paddingTop: 16, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.10)' },
  title: { color: '#fff', fontSize: 20, fontWeight: '900' },
  sub: { color: '#9aa4b2', marginTop: 4, fontSize: 12 },
  sectionTitle: { color: '#fff', fontWeight: '900', marginTop: 6 },
  webBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  webBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  card: { padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
});

