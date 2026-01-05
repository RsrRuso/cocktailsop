import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useFifoInventory, useFifoStores } from '../features/ops/inventory/queries';

export default function StoreDetailScreen({
  navigation,
  route,
}: {
  navigation: any;
  route: { params: { storeId: string } };
}) {
  const { user } = useAuth();
  const storeId = route.params.storeId;
  const stores = useFifoStores(user?.id);
  const inventory = useFifoInventory(user?.id);
  const [q, setQ] = useState('');

  const store = useMemo(() => (stores.data ?? []).find((s) => s.id === storeId), [stores.data, storeId]);
  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (inventory.data ?? [])
      .filter((r) => r.store_id === storeId)
      .filter((r) => {
        if (!query) return true;
        return `${r.items?.name ?? ''} ${r.items?.brand ?? ''} ${r.items?.category ?? ''}`.toLowerCase().includes(query);
      });
  }, [inventory.data, storeId, q]);

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{store?.name ?? 'Store'}</Text>
            <Text style={styles.sub}>{store?.location ?? ''} {store?.store_type ? `• ${store.store_type}` : ''}</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('WebRoute', { title: 'Store Detail (Web)', pathTemplate: `/store/${storeId}` })} style={styles.webBtn}>
            <Text style={styles.webBtnText}>Open web</Text>
          </Pressable>
        </View>
        <TextInput value={q} onChangeText={setQ} placeholder="Search store inventory…" placeholderTextColor="#6b7280" style={styles.search} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 10 }}>
        {inventory.isLoading ? <Text style={{ color: '#9aa4b2' }}>Loading…</Text> : null}
        {rows.map((r) => (
          <View key={r.id} style={styles.card}>
            <Text style={{ color: '#fff', fontWeight: '900' }}>{r.items?.name ?? 'Item'}</Text>
            <Text style={{ color: '#9aa4b2', marginTop: 2 }}>
              {r.items?.brand ? `${r.items.brand} • ` : ''}
              Qty {r.quantity} • Exp {r.expiration_date}
            </Text>
          </View>
        ))}
        {!inventory.isLoading && rows.length === 0 ? <Text style={{ color: '#9aa4b2' }}>No items in this store.</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1220' },
  top: { paddingTop: 16, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.10)' },
  title: { color: '#fff', fontSize: 20, fontWeight: '900' },
  sub: { color: '#9aa4b2', marginTop: 4, fontSize: 12 },
  search: { marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 10, color: '#fff', backgroundColor: 'rgba(255,255,255,0.04)' },
  webBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  webBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  card: { padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
});

