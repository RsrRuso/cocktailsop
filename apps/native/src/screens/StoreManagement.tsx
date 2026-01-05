import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useFifoStores } from '../features/ops/inventory/queries';
import { useCreateFifoStore, useUpdateFifoStore } from '../features/ops/inventory/mutations';

export default function StoreManagementScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const stores = useFifoStores(user?.id);
  const createStore = useCreateFifoStore(user?.id);
  const updateStore = useUpdateFifoStore(user?.id);

  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = stores.data ?? [];
    if (!query) return list;
    return list.filter((s) => `${s.name} ${s.location ?? ''} ${s.store_type ?? ''}`.toLowerCase().includes(query));
  }, [stores.data, q]);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [storeType, setStoreType] = useState('retail');

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState('');

  async function onCreate() {
    const n = name.trim();
    if (!n) return;
    try {
      await createStore.mutateAsync({ name: n, location: location.trim() || undefined, storeType: storeType.trim() || undefined });
      setCreateOpen(false);
      setName(''); setLocation(''); setStoreType('retail');
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Unknown error');
    }
  }

  async function onUpdate() {
    const n = name.trim();
    if (!editId || !n) return;
    try {
      await updateStore.mutateAsync({ id: editId, name: n, location: location.trim() || undefined, storeType: storeType.trim() || undefined });
      setEditOpen(false);
      setEditId('');
      setName(''); setLocation(''); setStoreType('retail');
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Unknown error');
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Store Management</Text>
            <Text style={styles.sub}>Native FIFO stores (personal).</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('WebRoute', { title: 'Store Management (Web)', pathTemplate: '/store-management' })} style={styles.webBtn}>
            <Text style={styles.webBtnText}>Open web</Text>
          </Pressable>
        </View>
        <TextInput value={q} onChangeText={setQ} placeholder="Search…" placeholderTextColor="#6b7280" style={styles.search} />
        <Pressable onPress={() => setCreateOpen(true)} style={[styles.primaryBtn, { marginTop: 10 }]}>
          <Text style={styles.primaryBtnText}>+ Create store</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 10 }}>
        {stores.isLoading ? <Text style={{ color: '#9aa4b2' }}>Loading…</Text> : null}
        {filtered.map((s) => (
          <Pressable
            key={s.id}
            style={styles.card}
            onPress={() => navigation.navigate('StoreDetail', { storeId: s.id })}
            onLongPress={() => {
              setEditId(s.id);
              setName(s.name);
              setLocation(s.location ?? '');
              setStoreType(s.store_type ?? 'retail');
              setEditOpen(true);
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '900' }}>{s.name}</Text>
            <Text style={{ color: '#9aa4b2', marginTop: 2 }}>
              {s.location ?? ''} {s.store_type ? `• ${s.store_type}` : ''}
            </Text>
            <Text style={{ color: '#64748b', marginTop: 6, fontSize: 12 }}>Tap to open • Long-press to edit</Text>
          </Pressable>
        ))}
      </ScrollView>

      {createOpen || editOpen ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{editOpen ? 'Edit store' : 'Create store'}</Text>
            <Text style={styles.label}>Name</Text>
            <TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor="#6b7280" />
            <Text style={styles.label}>Location</Text>
            <TextInput value={location} onChangeText={setLocation} style={styles.input} placeholderTextColor="#6b7280" />
            <Text style={styles.label}>Type</Text>
            <TextInput value={storeType} onChangeText={setStoreType} style={styles.input} placeholderTextColor="#6b7280" />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Pressable onPress={() => { setCreateOpen(false); setEditOpen(false); }} style={[styles.secondaryBtn, { flex: 1 }]}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => (editOpen ? onUpdate() : onCreate()).catch(() => {})}
                style={[styles.primaryBtn, { flex: 1, opacity: createStore.isPending || updateStore.isPending ? 0.6 : 1 }]}
              >
                <Text style={styles.primaryBtnText}>{createStore.isPending || updateStore.isPending ? 'Saving…' : 'Save'}</Text>
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

