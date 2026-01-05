import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useFifoItems } from '../features/ops/inventory/queries';
import { useCreateFifoItem, useUpdateFifoItem } from '../features/ops/inventory/mutations';

export default function MasterItemsScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const items = useFifoItems(user?.id);
  const createItem = useCreateFifoItem(user?.id);
  const updateItem = useUpdateFifoItem(user?.id);

  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = items.data ?? [];
    if (!query) return list;
    return list.filter((it) => `${it.name} ${it.brand ?? ''} ${it.category ?? ''} ${it.barcode ?? ''}`.toLowerCase().includes(query));
  }, [items.data, q]);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [barcode, setBarcode] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string>('');

  async function onCreate() {
    const n = name.trim();
    if (!n) return;
    try {
      await createItem.mutateAsync({ name: n, brand: brand.trim() || undefined, category: category.trim() || undefined, barcode: barcode.trim() || undefined });
      setCreateOpen(false);
      setName(''); setBrand(''); setCategory(''); setBarcode('');
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Unknown error');
    }
  }

  async function onUpdate() {
    const n = name.trim();
    if (!editId || !n) return;
    try {
      await updateItem.mutateAsync({ id: editId, name: n, brand: brand.trim() || undefined, category: category.trim() || undefined, barcode: barcode.trim() || undefined });
      setEditOpen(false);
      setEditId('');
      setName(''); setBrand(''); setCategory(''); setBarcode('');
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Unknown error');
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Master Items</Text>
            <Text style={styles.sub}>Native FIFO item master list.</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('WebRoute', { title: 'Master Items (Web)', pathTemplate: '/master-items' })} style={styles.webBtn}>
            <Text style={styles.webBtnText}>Open web</Text>
          </Pressable>
        </View>
        <TextInput value={q} onChangeText={setQ} placeholder="Search…" placeholderTextColor="#6b7280" style={styles.search} />
        <Pressable onPress={() => setCreateOpen(true)} style={[styles.primaryBtn, { marginTop: 10 }]}>
          <Text style={styles.primaryBtnText}>+ Create item</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 10 }}>
        {items.isLoading ? <Text style={{ color: '#9aa4b2' }}>Loading…</Text> : null}
        {filtered.map((it) => (
          <Pressable
            key={it.id}
            style={styles.card}
            onPress={() => {
              setEditId(it.id);
              setName(it.name);
              setBrand(it.brand ?? '');
              setCategory(it.category ?? '');
              setBarcode(it.barcode ?? '');
              setEditOpen(true);
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '900' }}>{it.name}</Text>
            <Text style={{ color: '#9aa4b2', marginTop: 2 }}>
              {it.brand ?? ''} {it.category ? `• ${it.category}` : ''} {it.barcode ? `• ${it.barcode}` : ''}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {createOpen || editOpen ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{editOpen ? 'Edit item' : 'Create item'}</Text>
            <Text style={styles.label}>Name</Text>
            <TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor="#6b7280" />
            <Text style={styles.label}>Brand</Text>
            <TextInput value={brand} onChangeText={setBrand} style={styles.input} placeholderTextColor="#6b7280" />
            <Text style={styles.label}>Category</Text>
            <TextInput value={category} onChangeText={setCategory} style={styles.input} placeholderTextColor="#6b7280" />
            <Text style={styles.label}>Barcode</Text>
            <TextInput value={barcode} onChangeText={setBarcode} style={styles.input} placeholderTextColor="#6b7280" autoCapitalize="none" />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Pressable onPress={() => { setCreateOpen(false); setEditOpen(false); }} style={[styles.secondaryBtn, { flex: 1 }]}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => (editOpen ? onUpdate() : onCreate()).catch(() => {})}
                style={[styles.primaryBtn, { flex: 1, opacity: createItem.isPending || updateItem.isPending ? 0.6 : 1 }]}
              >
                <Text style={styles.primaryBtnText}>{createItem.isPending || updateItem.isPending ? 'Saving…' : 'Save'}</Text>
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
  search: { marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 10, color: '#fff', backgroundColor: 'rgba(255,255,255,0.04)' },
  webBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  webBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  primaryBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(37,99,235,0.28)', borderWidth: 1, borderColor: 'rgba(37,99,235,0.35)' },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
  secondaryBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  secondaryBtnText: { color: '#fff', fontWeight: '900' },
  card: { padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  modalOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, justifyContent: 'center' },
  modal: { backgroundColor: '#0b1220', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', gap: 8 },
  label: { color: '#9aa4b2', marginTop: 8, fontWeight: '800', fontSize: 12 },
  input: { borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 10, color: '#fff', backgroundColor: 'rgba(255,255,255,0.04)' },
});

