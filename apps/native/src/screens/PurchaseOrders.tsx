import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useCreatePurchaseOrder } from '../features/ops/procurement/mutations';
import { useProcurementWorkspaces, usePurchaseOrders } from '../features/ops/procurement/queries';
import type { PurchaseOrderItemInput } from '../features/ops/procurement/types';
import { createSignedProcurementDocUrl, pickAndUploadProcurementDocument } from '../features/ops/procurement/storage';
import { Linking } from 'react-native';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

function todayYmd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function PurchaseOrdersScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();
  const userId = user?.id;

  const workspaces = useProcurementWorkspaces(userId);
  const initialWorkspaceId = (arguments as any)[0]?.route?.params?.workspaceId as string | undefined;
  const staffMode = Boolean((arguments as any)[0]?.route?.params?.staffMode);
  const [workspaceId, setWorkspaceId] = useState<string | null>(initialWorkspaceId ?? null);
  const wsName = useMemo(() => (workspaces.data ?? []).find((w) => w.id === workspaceId)?.name ?? null, [workspaces.data, workspaceId]);

  const orders = usePurchaseOrders(userId, workspaceId);
  const createPo = useCreatePurchaseOrder(userId, workspaceId);

  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = orders.data ?? [];
    if (!query) return list;
    return list.filter((o) => {
      return (
        (o.supplier_name ?? '').toLowerCase().includes(query) ||
        (o.order_number ?? '').toLowerCase().includes(query) ||
        (o.status ?? '').toLowerCase().includes(query)
      );
    });
  }, [orders.data, q]);

  const [createOpen, setCreateOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState(todayYmd());
  const [notes, setNotes] = useState('');
  const [documentPath, setDocumentPath] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [items, setItems] = useState<PurchaseOrderItemInput[]>([
    { item_name: '', item_code: '', quantity: 1, price_per_unit: 0 },
  ]);

  const total = useMemo(() => {
    return (items ?? []).reduce((sum, it) => sum + Number(it.quantity ?? 0) * Number(it.price_per_unit ?? 0), 0);
  }, [items]);

  async function submit() {
    try {
      await createPo.mutateAsync({
        supplierName,
        orderNumber,
        orderDate,
        notes,
        documentPath,
        items,
      });
      setCreateOpen(false);
      setSupplierName('');
      setOrderNumber('');
      setOrderDate(todayYmd());
      setNotes('');
      setDocumentPath(null);
      setDocumentName(null);
      setItems([{ item_name: '', item_code: '', quantity: 1, price_per_unit: 0 }]);
      Alert.alert('Created', 'Purchase order saved.');
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Could not create purchase order.');
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Purchase Orders
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {workspaceId ? `Workspace: ${wsName ?? workspaceId}` : 'Personal'}
          </Text>
        </View>
        <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => setCreateOpen(true)} disabled={!userId}>
          <Text style={styles.btnText}>+ New</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 10 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Workspace</Text>
          <Text style={styles.muted}>
            {staffMode ? 'Workspace locked by staff PIN session.' : 'Pick a procurement workspace, or stay in personal mode.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <Pressable
              style={[styles.btn, !workspaceId ? styles.primaryBtn : styles.secondaryBtn]}
              onPress={() => setWorkspaceId(null)}
              disabled={staffMode}
            >
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
                disabled={staffMode}
              >
                <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                  {w.name}
                </Text>
                <Text style={{ color: '#9aa4b2', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {w.description || '—'}
                </Text>
              </Pressable>
            ))}
            {(workspaces.data ?? []).length === 0 && !workspaces.isLoading ? <Text style={styles.muted}>No procurement workspaces yet.</Text> : null}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Orders</Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search supplier / order # / status…"
            placeholderTextColor="#6b7280"
            style={styles.search}
          />
          {orders.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
          {filtered.length === 0 && !orders.isLoading ? <Text style={styles.muted}>No orders.</Text> : null}
          <View style={{ gap: 10, marginTop: 10 }}>
            {filtered.map((o) => (
              <View key={o.id} style={styles.orderRow}>
                <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                  {o.supplier_name ?? 'Supplier'} {o.order_number ? `• ${o.order_number}` : ''}
                </Text>
                <Text style={{ color: '#9aa4b2', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {o.order_date ?? '—'} • {o.status ?? 'draft'} • Total {Number(o.total_amount ?? 0).toFixed(2)}
                </Text>
                {o.document_url ? (
                  <Pressable
                    style={[styles.btn, styles.secondaryBtn, { marginTop: 10 }]}
                    onPress={async () => {
                      try {
                        const url = await createSignedProcurementDocUrl(o.document_url ?? '');
                        await Linking.openURL(url);
                      } catch {
                        Alert.alert('Cannot open', 'Document is not accessible for this account.');
                      }
                    }}
                  >
                    <Text style={styles.btnText}>Open document</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[styles.btn, styles.secondaryBtn, { marginTop: 10 }]}
                  onPress={() =>
                    navigation.navigate('WebRoute', {
                      title: 'Purchase Orders (Web)',
                      pathTemplate: '/purchase-orders',
                    })
                  }
                >
                  <Text style={styles.btnText}>Open web (details)</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Purchase Order</Text>
            <Text style={styles.muted} numberOfLines={1}>
              {workspaceId ? `Workspace: ${wsName ?? workspaceId}` : 'Personal'}
            </Text>

            <TextInput value={supplierName} onChangeText={setSupplierName} placeholder="Supplier name" placeholderTextColor="#6b7280" style={styles.input} />
            <TextInput value={orderNumber} onChangeText={setOrderNumber} placeholder="Order # (optional)" placeholderTextColor="#6b7280" style={styles.input} />
            <TextInput value={orderDate} onChangeText={setOrderDate} placeholder="Order date (YYYY-MM-DD)" placeholderTextColor="#6b7280" style={styles.input} />
            <TextInput value={notes} onChangeText={setNotes} placeholder="Notes (optional)" placeholderTextColor="#6b7280" style={[styles.input, { height: 70 }]} multiline />

            <View style={{ gap: 8 }}>
              <Text style={styles.sectionTitle}>Document</Text>
              <Pressable
                style={[styles.btn, styles.secondaryBtn]}
                onPress={async () => {
                  if (!userId) return;
                  try {
                    setDocUploading(true);
                    const uploaded = await pickAndUploadProcurementDocument({ userId });
                    if (!uploaded) return;
                    setDocumentPath(uploaded.path);
                    setDocumentName(uploaded.name);
                    Alert.alert('Uploaded', uploaded.name);
                  } catch (e: any) {
                    Alert.alert('Upload failed', e?.message ?? 'Could not upload document.');
                  } finally {
                    setDocUploading(false);
                  }
                }}
                disabled={!userId || docUploading}
              >
                <Text style={styles.btnText}>{docUploading ? 'Uploading…' : documentPath ? 'Replace document' : 'Attach document'}</Text>
              </Pressable>
              {documentPath ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    style={[styles.btn, styles.secondaryBtn]}
                    onPress={async () => {
                      try {
                        const url = await createSignedProcurementDocUrl(documentPath);
                        await Linking.openURL(url);
                      } catch {
                        Alert.alert('Cannot open', 'Document is not accessible for this account.');
                      }
                    }}
                  >
                    <Text style={styles.btnText}>Preview</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.btn, styles.secondaryBtn]}
                    onPress={() => {
                      setDocumentPath(null);
                      setDocumentName(null);
                    }}
                  >
                    <Text style={styles.btnText}>Remove</Text>
                  </Pressable>
                </View>
              ) : null}
              <Text style={styles.muted} numberOfLines={2}>
                {documentName ?? (documentPath ? documentPath : 'No document attached.')}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Items</Text>
            <ScrollView style={{ maxHeight: 220 }}>
              {(items ?? []).map((it, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <TextInput
                    value={it.item_name}
                    onChangeText={(t) => setItems((arr) => arr.map((x, i) => (i === idx ? { ...x, item_name: t } : x)))}
                    placeholder="Item name"
                    placeholderTextColor="#6b7280"
                    style={[styles.input, { flex: 1 }]}
                  />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      value={String(it.quantity ?? '')}
                      onChangeText={(t) =>
                        setItems((arr) =>
                          arr.map((x, i) => (i === idx ? { ...x, quantity: Number(t.replace(/[^\d.]/g, '') || 0) } : x)),
                        )
                      }
                      placeholder="Qty"
                      placeholderTextColor="#6b7280"
                      keyboardType="decimal-pad"
                      style={[styles.input, { width: 90 }]}
                    />
                    <TextInput
                      value={String(it.price_per_unit ?? '')}
                      onChangeText={(t) =>
                        setItems((arr) =>
                          arr.map((x, i) => (i === idx ? { ...x, price_per_unit: Number(t.replace(/[^\d.]/g, '') || 0) } : x)),
                        )
                      }
                      placeholder="Unit $"
                      placeholderTextColor="#6b7280"
                      keyboardType="decimal-pad"
                      style={[styles.input, { width: 110 }]}
                    />
                  </View>
                  <Pressable
                    style={[styles.btn, styles.secondaryBtn]}
                    onPress={() => setItems((arr) => arr.filter((_, i) => i !== idx))}
                    disabled={(items ?? []).length <= 1}
                  >
                    <Text style={styles.btnText}>Remove</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>

            <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => setItems((arr) => [...arr, { item_name: '', item_code: '', quantity: 1, price_per_unit: 0 }])}>
              <Text style={styles.btnText}>+ Add item</Text>
            </Pressable>

            <Text style={styles.muted}>Total: {total.toFixed(2)}</Text>

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => setCreateOpen(false)} disabled={createPo.isPending}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.primaryBtn]} onPress={() => submit()} disabled={createPo.isPending || docUploading}>
                <Text style={styles.btnText}>{createPo.isPending ? 'Saving…' : 'Save'}</Text>
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
  orderRow: {
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
    maxWidth: 560,
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
  itemRow: {
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    gap: 8,
    marginBottom: 8,
  },
});

