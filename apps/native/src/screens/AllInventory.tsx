import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useFifoInventory, useFifoStores } from '../features/ops/inventory/queries';

export default function AllInventoryScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const stores = useFifoStores(user?.id);
  const inventory = useFifoInventory(user?.id);
  const [q, setQ] = useState('');
  const [storeId, setStoreId] = useState<string>('');

  const grouped = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = (inventory.data ?? []).filter((r) => {
      if (storeId && r.store_id !== storeId) return false;
      if (!query) return true;
      return `${r.items?.name ?? ''} ${r.items?.brand ?? ''} ${r.items?.category ?? ''}`.toLowerCase().includes(query);
    });

    const m = new Map<string, { storeName: string; rows: any[] }>();
    for (const r of list) {
      const key = r.store_id;
      const entry = m.get(key) ?? { storeName: r.stores?.name ?? 'Store', rows: [] };
      entry.rows.push(r);
      m.set(key, entry);
    }
    return Array.from(m.entries()).map(([id, v]) => ({ storeId: id, ...v }));
  }, [inventory.data, q, storeId]);

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>All Inventory</Text>
            <Text style={styles.sub}>Native read-only view (FIFO inventory).</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('WebRoute', { title: 'All Inventory (Web)', pathTemplate: '/all-inventory' })} style={styles.webBtn}>
            <Text style={styles.webBtnText}>Open web</Text>
          </Pressable>
        </View>

        <TextInput value={q} onChangeText={setQ} placeholder="Search…" placeholderTextColor="#6b7280" style={styles.search} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
          <Pressable onPress={() => setStoreId('')} style={[styles.pill, !storeId && styles.pillActive]}>
            <Text style={styles.pillText}>All stores</Text>
          </Pressable>
          {(stores.data ?? []).map((s) => (
            <Pressable key={s.id} onPress={() => setStoreId(s.id)} style={[styles.pill, storeId === s.id && styles.pillActive]}>
              <Text style={styles.pillText}>{s.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 12 }}>
        {inventory.isLoading ? <Text style={{ color: '#9aa4b2' }}>Loading…</Text> : null}
        {grouped.map((g) => (
          <View key={g.storeId} style={styles.section}>
            <Pressable onPress={() => navigation.navigate('StoreDetail', { storeId: g.storeId })}>
              <Text style={styles.sectionTitle}>{g.storeName}</Text>
            </Pressable>
            <View style={{ gap: 8, marginTop: 8 }}>
              {g.rows.map((r) => (
                <View key={r.id} style={styles.row}>
                  <Text style={{ color: '#fff', fontWeight: '900' }}>{r.items?.name ?? 'Item'}</Text>
                  <Text style={{ color: '#9aa4b2', marginTop: 2 }}>
                    Qty {r.quantity} • Exp {r.expiration_date}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
        {!inventory.isLoading && (inventory.data ?? []).length === 0 ? <Text style={{ color: '#9aa4b2' }}>No inventory yet.</Text> : null}
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
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  pillActive: { backgroundColor: 'rgba(255,255,255,0.10)' },
  pillText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  webBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  webBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  section: { padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  sectionTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  row: { padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
});

