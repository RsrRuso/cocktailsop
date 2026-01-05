import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useFifoActivity, useFifoEmployees, useFifoInventory, useFifoItems, useFifoStores, useFifoTransfers } from '../features/ops/inventory/queries';
import { useCreateFifoEmployee, useCreateFifoInventory, useCreateFifoItem, useCreateFifoStore, useCreateFifoTransfer } from '../features/ops/inventory/mutations';

type Nav = { navigate: (name: string, params?: any) => void };

export default function InventoryManagerScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();
  const stores = useFifoStores(user?.id);
  const items = useFifoItems(user?.id);
  const inventory = useFifoInventory(user?.id);
  const employees = useFifoEmployees(user?.id);
  const transfers = useFifoTransfers(user?.id);
  const activity = useFifoActivity(user?.id);
  const createRow = useCreateFifoInventory(user?.id);
  const createStore = useCreateFifoStore(user?.id);
  const createItem = useCreateFifoItem(user?.id);
  const createEmployee = useCreateFifoEmployee(user?.id);
  const createTransfer = useCreateFifoTransfer(user?.id);

  const [tab, setTab] = useState<'inventory' | 'transfers' | 'activity' | 'setup'>('inventory');
  const [q, setQ] = useState('');
  const [storeId, setStoreId] = useState<string>('');

  const [addOpen, setAddOpen] = useState(false);
  const [newStoreId, setNewStoreId] = useState('');
  const [newItemId, setNewItemId] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newExp, setNewExp] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const [createStoreOpen, setCreateStoreOpen] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeLocation, setStoreLocation] = useState('');
  const [storeType, setStoreType] = useState('retail');

  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemBrand, setItemBrand] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemBarcode, setItemBarcode] = useState('');

  const [createEmployeeOpen, setCreateEmployeeOpen] = useState(false);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeTitle, setEmployeeTitle] = useState('Staff');

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFromInventoryId, setTransferFromInventoryId] = useState('');
  const [transferFromStoreId, setTransferFromStoreId] = useState('');
  const [transferToStoreId, setTransferToStoreId] = useState('');
  const [transferEmployeeId, setTransferEmployeeId] = useState('');
  const [transferQty, setTransferQty] = useState('1');
  const [transferNotes, setTransferNotes] = useState('');

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

  async function onCreateStore() {
    const name = storeName.trim();
    if (!name) return;
    try {
      await createStore.mutateAsync({ name, location: storeLocation.trim() || undefined, storeType: storeType.trim() || undefined });
      setCreateStoreOpen(false);
      setStoreName(''); setStoreLocation(''); setStoreType('retail');
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Unknown error');
    }
  }

  async function onCreateItem() {
    const name = itemName.trim();
    if (!name) return;
    try {
      await createItem.mutateAsync({
        name,
        brand: itemBrand.trim() || undefined,
        category: itemCategory.trim() || undefined,
        barcode: itemBarcode.trim() || undefined,
      });
      setCreateItemOpen(false);
      setItemName(''); setItemBrand(''); setItemCategory(''); setItemBarcode('');
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Unknown error');
    }
  }

  async function onCreateEmployee() {
    const name = employeeName.trim();
    const title = employeeTitle.trim();
    if (!name || !title) return;
    try {
      await createEmployee.mutateAsync({ name, title });
      setCreateEmployeeOpen(false);
      setEmployeeName(''); setEmployeeTitle('Staff');
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Unknown error');
    }
  }

  async function onCreateTransfer() {
    const qty = Number(transferQty);
    if (!transferFromInventoryId || !transferFromStoreId || !transferToStoreId || !transferEmployeeId) {
      Alert.alert('Missing fields', 'Pick inventory row, from store, to store and employee.');
      return;
    }
    if (transferFromStoreId === transferToStoreId) {
      Alert.alert('Invalid', 'From and To store cannot be the same.');
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      Alert.alert('Invalid quantity', 'Quantity must be positive.');
      return;
    }
    try {
      await createTransfer.mutateAsync({
        fromInventoryId: transferFromInventoryId,
        fromStoreId: transferFromStoreId,
        toStoreId: transferToStoreId,
        transferredBy: transferEmployeeId,
        quantity: qty,
        notes: transferNotes.trim() || undefined,
      });
      setTransferOpen(false);
      setTransferFromInventoryId('');
      setTransferFromStoreId('');
      setTransferToStoreId('');
      setTransferEmployeeId('');
      setTransferQty('1');
      setTransferNotes('');
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
          {(['inventory','transfers','activity','setup'] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.filterPill, tab === t && styles.filterPillActive]}>
              <Text style={styles.filterText}>{t.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

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

        {tab === 'inventory' ? (
          <Pressable onPress={() => setAddOpen(true)} style={[styles.primaryBtn, { marginTop: 10 }]}>
            <Text style={styles.primaryBtnText}>+ Add inventory row</Text>
          </Pressable>
        ) : null}
        {tab === 'transfers' ? (
          <Pressable onPress={() => setTransferOpen(true)} style={[styles.primaryBtn, { marginTop: 10 }]}>
            <Text style={styles.primaryBtnText}>+ Create transfer</Text>
          </Pressable>
        ) : null}
        {tab === 'setup' ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <Pressable onPress={() => setCreateStoreOpen(true)} style={[styles.primaryBtn, { flex: 1 }]}>
              <Text style={styles.primaryBtnText}>+ Store</Text>
            </Pressable>
            <Pressable onPress={() => setCreateItemOpen(true)} style={[styles.primaryBtn, { flex: 1 }]}>
              <Text style={styles.primaryBtnText}>+ Item</Text>
            </Pressable>
            <Pressable onPress={() => setCreateEmployeeOpen(true)} style={[styles.primaryBtn, { flex: 1 }]}>
              <Text style={styles.primaryBtnText}>+ Staff</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 10 }}>
        {tab === 'inventory' ? (
          <>
            {inventory.isLoading ? <Text style={{ color: '#9aa4b2' }}>Loading…</Text> : null}
            {filtered.map((r) => (
              <Pressable key={r.id} style={styles.card} onPress={() => { setTransferFromInventoryId(r.id); setTransferFromStoreId(r.store_id); }}>
                <Text style={{ color: '#fff', fontWeight: '900' }}>{r.items?.name ?? 'Item'}</Text>
                <Text style={{ color: '#9aa4b2', marginTop: 2 }}>
                  {r.items?.brand ? `${r.items.brand} • ` : ''}
                  {r.stores?.name ?? 'Store'} • Qty {r.quantity}
                </Text>
                <Text style={{ color: '#64748b', marginTop: 6, fontSize: 12 }}>
                  Exp {r.expiration_date} • Priority {r.priority_score ?? 0}
                </Text>
                <Text style={{ color: '#64748b', marginTop: 6, fontSize: 12 }}>
                  (Tap to prefill transfer source)
                </Text>
              </Pressable>
            ))}
            {!inventory.isLoading && filtered.length === 0 ? <Text style={{ color: '#9aa4b2' }}>No inventory found.</Text> : null}
          </>
        ) : null}

        {tab === 'transfers' ? (
          <>
            {transfers.isLoading ? <Text style={{ color: '#9aa4b2' }}>Loading…</Text> : null}
            {(transfers.data ?? []).filter((t) => t.from_store_id !== t.to_store_id).map((t) => (
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
                {t.notes ? <Text style={{ color: '#9aa4b2', marginTop: 6 }}>{t.notes}</Text> : null}
              </View>
            ))}
          </>
        ) : null}

        {tab === 'activity' ? (
          <>
            {activity.isLoading ? <Text style={{ color: '#9aa4b2' }}>Loading…</Text> : null}
            {(activity.data ?? []).map((a) => (
              <View key={a.id} style={styles.card}>
                <Text style={{ color: '#fff', fontWeight: '900' }}>{a.action_type}</Text>
                <Text style={{ color: '#9aa4b2', marginTop: 2 }}>
                  {a.stores?.name ?? 'Store'} • {a.employees?.name ?? 'Staff'}
                </Text>
                <Text style={{ color: '#64748b', marginTop: 6, fontSize: 12 }}>
                  {new Date(a.created_at).toLocaleString()}
                </Text>
              </View>
            ))}
          </>
        ) : null}

        {tab === 'setup' ? (
          <>
            <Text style={{ color: '#fff', fontWeight: '900' }}>Stores</Text>
            {(stores.data ?? []).map((s) => (
              <View key={s.id} style={styles.card}>
                <Text style={{ color: '#fff', fontWeight: '900' }}>{s.name}</Text>
                <Text style={{ color: '#9aa4b2', marginTop: 2 }}>{s.location ?? ''} {s.store_type ? `• ${s.store_type}` : ''}</Text>
              </View>
            ))}
            <Text style={{ color: '#fff', fontWeight: '900', marginTop: 12 }}>Items</Text>
            {(items.data ?? []).slice(0, 20).map((it) => (
              <View key={it.id} style={styles.card}>
                <Text style={{ color: '#fff', fontWeight: '900' }}>{it.name}</Text>
                <Text style={{ color: '#9aa4b2', marginTop: 2 }}>{it.brand ?? ''} {it.category ? `• ${it.category}` : ''}</Text>
              </View>
            ))}
            <Text style={{ color: '#fff', fontWeight: '900', marginTop: 12 }}>Staff</Text>
            {(employees.data ?? []).map((e) => (
              <View key={e.id} style={styles.card}>
                <Text style={{ color: '#fff', fontWeight: '900' }}>{e.name}</Text>
                <Text style={{ color: '#9aa4b2', marginTop: 2 }}>{e.title}</Text>
              </View>
            ))}
          </>
        ) : null}
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

      {createStoreOpen ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Create store</Text>
            <Text style={styles.label}>Name</Text>
            <TextInput value={storeName} onChangeText={setStoreName} style={styles.input} placeholderTextColor="#6b7280" />
            <Text style={styles.label}>Location (optional)</Text>
            <TextInput value={storeLocation} onChangeText={setStoreLocation} style={styles.input} placeholderTextColor="#6b7280" />
            <Text style={styles.label}>Type</Text>
            <TextInput value={storeType} onChangeText={setStoreType} style={styles.input} placeholderTextColor="#6b7280" />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Pressable onPress={() => setCreateStoreOpen(false)} style={[styles.secondaryBtn, { flex: 1 }]}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => onCreateStore().catch(() => {})} style={[styles.primaryBtn, { flex: 1, opacity: createStore.isPending ? 0.6 : 1 }]}>
                <Text style={styles.primaryBtnText}>{createStore.isPending ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {createItemOpen ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Create item</Text>
            <Text style={styles.label}>Name</Text>
            <TextInput value={itemName} onChangeText={setItemName} style={styles.input} placeholderTextColor="#6b7280" />
            <Text style={styles.label}>Brand (optional)</Text>
            <TextInput value={itemBrand} onChangeText={setItemBrand} style={styles.input} placeholderTextColor="#6b7280" />
            <Text style={styles.label}>Category (optional)</Text>
            <TextInput value={itemCategory} onChangeText={setItemCategory} style={styles.input} placeholderTextColor="#6b7280" />
            <Text style={styles.label}>Barcode (optional)</Text>
            <TextInput value={itemBarcode} onChangeText={setItemBarcode} style={styles.input} placeholderTextColor="#6b7280" autoCapitalize="none" />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Pressable onPress={() => setCreateItemOpen(false)} style={[styles.secondaryBtn, { flex: 1 }]}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => onCreateItem().catch(() => {})} style={[styles.primaryBtn, { flex: 1, opacity: createItem.isPending ? 0.6 : 1 }]}>
                <Text style={styles.primaryBtnText}>{createItem.isPending ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {createEmployeeOpen ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Create staff</Text>
            <Text style={styles.label}>Name</Text>
            <TextInput value={employeeName} onChangeText={setEmployeeName} style={styles.input} placeholderTextColor="#6b7280" />
            <Text style={styles.label}>Title</Text>
            <TextInput value={employeeTitle} onChangeText={setEmployeeTitle} style={styles.input} placeholderTextColor="#6b7280" />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Pressable onPress={() => setCreateEmployeeOpen(false)} style={[styles.secondaryBtn, { flex: 1 }]}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => onCreateEmployee().catch(() => {})} style={[styles.primaryBtn, { flex: 1, opacity: createEmployee.isPending ? 0.6 : 1 }]}>
                <Text style={styles.primaryBtnText}>{createEmployee.isPending ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {transferOpen ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Create transfer</Text>
            <Text style={{ color: '#9aa4b2', marginTop: 4, fontSize: 12 }}>
              Tip: tap an inventory row first to prefill the source.
            </Text>

            <Text style={styles.label}>From store</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(stores.data ?? []).map((s) => (
                <Pressable key={s.id} onPress={() => setTransferFromStoreId(s.id)} style={[styles.pickPill, transferFromStoreId === s.id && styles.pickPillActive]}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>{s.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>To store</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(stores.data ?? []).map((s) => (
                <Pressable key={s.id} onPress={() => setTransferToStoreId(s.id)} style={[styles.pickPill, transferToStoreId === s.id && styles.pickPillActive]}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>{s.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>Source inventory row</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(inventory.data ?? []).filter((r) => !transferFromStoreId || r.store_id === transferFromStoreId).slice(0, 30).map((r) => (
                <Pressable key={r.id} onPress={() => setTransferFromInventoryId(r.id)} style={[styles.pickPill, transferFromInventoryId === r.id && styles.pickPillActive]}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>{r.items?.name ?? 'Item'} ({r.quantity})</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={{ color: '#9aa4b2', marginTop: 6, fontSize: 12 }}>
              (Showing first 30 rows; full picker comes next.)
            </Text>

            <Text style={styles.label}>Transferred by (staff)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(employees.data ?? []).map((e) => (
                <Pressable key={e.id} onPress={() => setTransferEmployeeId(e.id)} style={[styles.pickPill, transferEmployeeId === e.id && styles.pickPillActive]}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>{e.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {(employees.data ?? []).length === 0 ? <Text style={{ color: '#9aa4b2', marginTop: 6 }}>Create a staff member in SETUP first.</Text> : null}

            <Text style={styles.label}>Quantity</Text>
            <TextInput value={transferQty} onChangeText={setTransferQty} keyboardType="numeric" style={styles.input} placeholderTextColor="#6b7280" />

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput value={transferNotes} onChangeText={setTransferNotes} style={[styles.input, { minHeight: 60 }]} placeholderTextColor="#6b7280" multiline />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Pressable onPress={() => setTransferOpen(false)} style={[styles.secondaryBtn, { flex: 1 }]}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => onCreateTransfer().catch(() => {})} style={[styles.primaryBtn, { flex: 1, opacity: createTransfer.isPending ? 0.6 : 1 }]}>
                <Text style={styles.primaryBtnText}>{createTransfer.isPending ? 'Saving…' : 'Save'}</Text>
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

