import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useUpdateMasterItem } from '../features/ops/procurement/mutations';
import { usePOMasterItems, useProcurementWorkspaces } from '../features/ops/procurement/queries';
import type { MasterItemLite } from '../features/ops/procurement/types';

type Nav = { goBack: () => void };

export default function POMasterItemsScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();
  const userId = user?.id;

  const workspaces = useProcurementWorkspaces(userId);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const items = usePOMasterItems(userId, workspaceId);
  const update = useUpdateMasterItem(userId, workspaceId);

  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = items.data ?? [];
    if (!query) return list;
    return list.filter((i) => {
      return (
        i.item_name.toLowerCase().includes(query) ||
        (i.category ?? '').toLowerCase().includes(query) ||
        (i.unit ?? '').toLowerCase().includes(query)
      );
    });
  }, [items.data, q]);

  const [edit, setEdit] = useState<{ open: boolean; item?: MasterItemLite }>({ open: false });
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('');
  const [lastPrice, setLastPrice] = useState('');

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            PO Master Items
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {workspaceId ? 'Workspace' : 'Personal'} • {(items.data ?? []).length} items
          </Text>
        </View>
        <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => items.refetch()} disabled={items.isFetching}>
          <Text style={styles.btnText}>{items.isFetching ? '…' : 'Refresh'}</Text>
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
              <Text style={styles.btnText}>{workspaces.isFetching ? '…' : 'Refresh'}</Text>
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

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Items</Text>
          <TextInput value={q} onChangeText={setQ} placeholder="Search…" placeholderTextColor="#6b7280" style={styles.search} />
          {items.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
          {filtered.length === 0 && !items.isLoading ? <Text style={styles.muted}>No items.</Text> : null}
          <View style={{ gap: 10, marginTop: 10 }}>
            {filtered.map((i) => (
              <Pressable
                key={i.id}
                style={styles.row}
                onPress={() => {
                  setEdit({ open: true, item: i });
                  setUnit(i.unit ?? '');
                  setCategory(i.category ?? '');
                  setLastPrice(i.last_price != null ? String(i.last_price) : '');
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                  {i.item_name}
                </Text>
                <Text style={{ color: '#9aa4b2', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {i.category ? `Category: ${i.category}` : 'No category'} • {i.unit ? `Unit: ${i.unit}` : 'No unit'} •{' '}
                  {i.last_price != null ? `Last: ${Number(i.last_price).toFixed(2)}` : 'No price'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={edit.open} transparent animationType="fade" onRequestClose={() => setEdit({ open: false })}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit master item</Text>
            <Text style={styles.muted} numberOfLines={1}>
              {edit.item?.item_name ?? ''}
            </Text>
            <TextInput value={unit} onChangeText={setUnit} placeholder="Unit (e.g. bottle)" placeholderTextColor="#6b7280" style={styles.input} />
            <TextInput value={category} onChangeText={setCategory} placeholder="Category (e.g. spirits)" placeholderTextColor="#6b7280" style={styles.input} />
            <TextInput
              value={lastPrice}
              onChangeText={setLastPrice}
              placeholder="Last price"
              placeholderTextColor="#6b7280"
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => setEdit({ open: false })} disabled={update.isPending}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.primaryBtn]}
                onPress={() => {
                  const item = edit.item;
                  if (!item) return;
                  update
                    .mutateAsync({
                      id: item.id,
                      unit: unit.trim() || null,
                      category: category.trim() || null,
                      last_price: lastPrice.trim() ? Number(lastPrice) : null,
                    })
                    .then(() => {
                      setEdit({ open: false });
                      Alert.alert('Saved', 'Item updated.');
                    })
                    .catch((e: any) => Alert.alert('Failed', e?.message ?? 'Could not update item.'));
                }}
                disabled={update.isPending}
              >
                <Text style={styles.btnText}>{update.isPending ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
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
  btnText: { color: '#fff', fontWeight: '900' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.60)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#0b1220',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
    gap: 10,
  },
  modalTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});

