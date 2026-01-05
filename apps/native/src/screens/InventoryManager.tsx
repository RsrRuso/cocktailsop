import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useFifoInventory, useFifoItems, useFifoStores } from '../features/ops/inventory/queries';
import { useCreateFifoInventory } from '../features/ops/inventory/mutations';

type Nav = { navigate: (name: string, params?: any) => void };

export default function InventoryManagerScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();
  const stores = useFifoStores(user?.id);
  const items = useFifoItems(user?.id);
  const inventory = useFifoInventory(user?.id);
  const createRow = useCreateFifoInventory(user?.id);

  const [q, setQ] = useState('');
  const [storeId, setStoreId] = useState<string>('');

  const [addOpen, setAddOpen] = useState(false);
  const [newStoreId, setNewStoreId] = useState('');
  const [newItemId, setNewItemId] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newExp, setNewExp] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const filtered = useMemo(() => {
    const list = inventory.data ?? [];
    const query = q.trim().toLowerCase();
    return list.filter((r) => {
      if (storeId && r.store_id !== storeId) return false;
      if (!query) return true;
      const name = `${r.items?.name ?? ''} ${r.items?.brand ?? ''} ${r.items?.category ?? ''} ${r.stores?.name ?? ''}`.toLowerCase();
      return name.includes(query);
    });
  }, [inventory.data, q, storeId]);

  async function onAdd() {
    if (!newStoreId || !newItemId) {
      Alert.alert('Missing fields', 'Pick a store and an item.');
      return;
    }
    const qty = Number(newQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      Alert.alert('Invalid quantity', 'Quantity must be a positive number.');
      return;
    }
    if (!newExp) {
      Alert.alert('Missing expiration date', 'Use YYYY-MM-DD.');
      return;
    }
    try {
      await createRow.mutateAsync({
        storeId: newStoreId,
        itemId: newItemId,
        quantity: qty,
        expirationDate: newExp,
        notes: newNotes.trim() || undefined,
      });
      setAddOpen(false);
      setNewStoreId('');
      setNewItemId('');
      setNewQty('1');
      setNewExp('');
      setNewNotes('');
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Unknown error');
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Inventory Manager</Text>
            <Text style={styles.sub}>Native (FIFO inventory). Advanced tools still available via WebView.</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('WebRoute', { title: 'Inventory Manager (Web)', pathTemplate: '/inventory-manager' })}
            style={styles.webBtn}
          >
            <Text style={styles.webBtnText}>Open web</Text>
          </Pressable>
        </View>

        <TextInput value={q} onChangeText={setQ} placeholder="Search items…" placeholderTextColor="#6b7280" style={styles.search} />

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Pressable onPress={() => setStoreId('')} style={[styles.filterPill, !storeId && styles.filterPillActive]}>
            <Text style={styles.filterText}>All stores</Text>
          </Pressable>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {(stores.data ?? []).map((s) => (
              <Pressable key={s.id} onPress={() => setStoreId(s.id)} style={[styles.filterPill, storeId === s.id && styles.filterPillActive]}>
                <Text style={styles.filterText}>{s.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <Pressable onPress={() => setAddOpen(true)} style={[styles.primaryBtn, { marginTop: 10 }]}>
          <Text style={styles.primaryBtnText}>+ Add inventory row</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 10 }}>
        {inventory.isLoading ? <Text style={{ color: '#9aa4b2' }}>Loading…</Text> : null}
        {filtered.map((r) => (
          <View key={r.id} style={styles.card}>
            <Text style={{ color: '#fff', fontWeight: '900' }}>{r.items?.name ?? 'Item'}</Text>
            <Text style={{ color: '#9aa4b2', marginTop: 2 }}>
              {r.items?.brand ? `${r.items.brand} • ` : ''}
              {r.stores?.name ?? 'Store'} • Qty {r.quantity}
            </Text>
            <Text style={{ color: '#64748b', marginTop: 6, fontSize: 12 }}>
              Exp {r.expiration_date} • Priority {r.priority_score ?? 0}
            </Text>
          </View>
        ))}
        {!inventory.isLoading && filtered.length === 0 ? <Text style={{ color: '#9aa4b2' }}>No inventory found.</Text> : null}
      </ScrollView>

      {addOpen ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Add inventory</Text>

            <Text style={styles.label}>Store</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(stores.data ?? []).map((s) => (
                <Pressable key={s.id} onPress={() => setNewStoreId(s.id)} style={[styles.pickPill, newStoreId === s.id && styles.pickPillActive]}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>{s.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>Item</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(items.data ?? []).slice(0, 50).map((it) => (
                <Pressable key={it.id} onPress={() => setNewItemId(it.id)} style={[styles.pickPill, newItemId === it.id && styles.pickPillActive]}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>{it.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={{ color: '#9aa4b2', marginTop: 6, fontSize: 12 }}>
              (Showing first 50 items here; full picker comes next.)
            </Text>

            <Text style={styles.label}>Quantity</Text>
            <TextInput value={newQty} onChangeText={setNewQty} keyboardType="numeric" style={styles.input} placeholderTextColor="#6b7280" />

            <Text style={styles.label}>Expiration (YYYY-MM-DD)</Text>
            <TextInput value={newExp} onChangeText={setNewExp} style={styles.input} placeholder="2026-12-31" placeholderTextColor="#6b7280" />

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput value={newNotes} onChangeText={setNewNotes} style={[styles.input, { minHeight: 60 }]} placeholderTextColor="#6b7280" multiline />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Pressable onPress={() => setAddOpen(false)} style={[styles.secondaryBtn, { flex: 1 }]}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => onAdd().catch(() => {})} style={[styles.primaryBtn, { flex: 1, opacity: createRow.isPending ? 0.6 : 1 }]}>
                <Text style={styles.primaryBtnText}>{createRow.isPending ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1220' },
  top: { paddingTop: 16, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.10)' },
  title: { color: '#fff', fontSize: 20, fontWeight: '900' },
  sub: { color: '#9aa4b2', marginTop: 4, fontSize: 12 },
  search: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  filterPillActive: { backgroundColor: 'rgba(255,255,255,0.10)' },
  filterText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(37,99,235,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.35)',
  },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  secondaryBtnText: { color: '#fff', fontWeight: '900' },
  webBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  webBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  card: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modalOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, justifyContent: 'center' },
  modal: { backgroundColor: '#0b1220', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', gap: 8 },
  label: { color: '#9aa4b2', marginTop: 8, fontWeight: '800', fontSize: 12 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pickPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  pickPillActive: { backgroundColor: 'rgba(37,99,235,0.28)', borderColor: 'rgba(37,99,235,0.35)' },
});

