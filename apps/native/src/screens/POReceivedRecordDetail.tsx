import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useAddReceivedItem, useDeleteReceivedItem, useMatchReceivedRecordToPO } from '../features/ops/procurement/mutations';
import { usePOReceivedItemsForRecord } from '../features/ops/procurement/queries';
import { usePurchaseOrders } from '../features/ops/procurement/queries';

type Nav = { goBack: () => void; navigate: (name: string, params?: any) => void };

export default function POReceivedRecordDetailScreen({
  navigation,
  route,
}: {
  navigation: Nav;
  route: any;
}) {
  const { user } = useAuth();
  const userId = user?.id;

  const recordId: string = route?.params?.recordId;
  const workspaceId: string | null = route?.params?.workspaceId ?? null;
  const supplierName: string | null = route?.params?.supplierName ?? null;
  const documentNumber: string | null = route?.params?.documentNumber ?? null;
  const receivedDate: string | null = route?.params?.receivedDate ?? null;

  const itemsQ = usePOReceivedItemsForRecord(userId, workspaceId, recordId);
  const add = useAddReceivedItem(userId, workspaceId);
  const del = useDeleteReceivedItem(userId, workspaceId);
  const match = useMatchReceivedRecordToPO(userId, workspaceId);
  const orders = usePurchaseOrders(userId, workspaceId);
  const [matchOpen, setMatchOpen] = useState(false);
  const [matchQ, setMatchQ] = useState('');

  const items = itemsQ.data ?? [];
  const totals = useMemo(() => {
    const qty = items.reduce((s, it) => s + Number(it.quantity ?? 0), 0);
    const value = items.reduce((s, it) => s + Number(it.total_price ?? 0), 0);
    return { qty, value, count: items.length };
  }, [items]);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  async function submit() {
    if (!recordId) return;
    try {
      await add.mutateAsync({
        recordId,
        documentNumber,
        receivedDate,
        item_name: name,
        quantity: Number(qty),
        unit: unit.trim() || null,
        unit_price: unitPrice.trim() ? Number(unitPrice) : null,
      });
      setOpen(false);
      setName('');
      setQty('1');
      setUnit('');
      setUnitPrice('');
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Could not add item.');
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
            Received Items
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {supplierName ?? 'Supplier'} {documentNumber ? `• ${documentNumber}` : ''} {receivedDate ? `• ${receivedDate}` : ''}
          </Text>
        </View>
        <Pressable style={[styles.btn, styles.primaryBtn]} onPress={() => setOpen(true)} disabled={!userId}>
          <Text style={styles.btnText}>+ Add</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 10 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.muted}>
            {totals.count} items • Qty {totals.qty.toFixed(2)} • Value {totals.value.toFixed(2)}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <Pressable
              style={[styles.btn, styles.secondaryBtn]}
              onPress={() => setMatchOpen(true)}
              disabled={!recordId || match.isPending}
            >
              <Text style={styles.btnText}>Match to PO</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.secondaryBtn]}
              onPress={() => navigation.navigate('POVarianceReport', { recordId, workspaceId })}
            >
              <Text style={styles.btnText}>Variance</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => itemsQ.refetch()} disabled={itemsQ.isFetching}>
              <Text style={styles.btnText}>{itemsQ.isFetching ? '…' : 'Refresh'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Items</Text>
          {itemsQ.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
          {items.length === 0 && !itemsQ.isLoading ? <Text style={styles.muted}>No received items yet.</Text> : null}
          <View style={{ gap: 10, marginTop: 10 }}>
            {items.map((it) => (
              <View key={it.id} style={styles.row}>
                <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                  {it.item_name}
                </Text>
                <Text style={{ color: '#9aa4b2', fontSize: 12, marginTop: 2 }} numberOfLines={2}>
                  Qty {Number(it.quantity ?? 0)} {it.unit ?? ''} • Unit {Number(it.unit_price ?? 0).toFixed(2)} • Total {Number(it.total_price ?? 0).toFixed(2)}
                </Text>
                <Pressable
                  style={[styles.btn, styles.dangerBtn, { marginTop: 10 }]}
                  onPress={() => {
                    Alert.alert('Delete item?', it.item_name, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => del.mutate({ id: it.id, recordId }) },
                    ]);
                  }}
                  disabled={del.isPending}
                >
                  <Text style={styles.btnText}>{del.isPending ? 'Deleting…' : 'Delete'}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add received item</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Item name" placeholderTextColor="#6b7280" style={styles.input} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput value={qty} onChangeText={setQty} placeholder="Qty" placeholderTextColor="#6b7280" keyboardType="decimal-pad" style={[styles.input, { flex: 1 }]} />
              <TextInput value={unit} onChangeText={setUnit} placeholder="Unit" placeholderTextColor="#6b7280" style={[styles.input, { flex: 1 }]} />
            </View>
            <TextInput value={unitPrice} onChangeText={setUnitPrice} placeholder="Unit price (optional)" placeholderTextColor="#6b7280" keyboardType="decimal-pad" style={styles.input} />
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => setOpen(false)} disabled={add.isPending}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.primaryBtn]} onPress={() => submit()} disabled={add.isPending}>
                <Text style={styles.btnText}>{add.isPending ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={matchOpen} transparent animationType="fade" onRequestClose={() => setMatchOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Match to Purchase Order</Text>
            <Text style={styles.muted} numberOfLines={2}>
              Select the PO this delivery belongs to. This will mark the PO as received and generate variance.
            </Text>
            <TextInput
              value={matchQ}
              onChangeText={setMatchQ}
              placeholder="Search by supplier or order #…"
              placeholderTextColor="#6b7280"
              style={styles.input}
            />
            <ScrollView style={{ maxHeight: 320 }}>
              {(orders.data ?? [])
                .filter((o) => {
                  const q = matchQ.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    (o.supplier_name ?? '').toLowerCase().includes(q) ||
                    (o.order_number ?? '').toLowerCase().includes(q) ||
                    (o.status ?? '').toLowerCase().includes(q)
                  );
                })
                .slice(0, 50)
                .map((o) => (
                  <Pressable
                    key={o.id}
                    style={styles.pickRow}
                    onPress={() => {
                      if (!recordId) return;
                      Alert.alert('Match record to PO?', `${o.supplier_name ?? 'Supplier'} ${o.order_number ?? ''}`.trim(), [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Match',
                          style: 'default',
                          onPress: () => {
                            match
                              .mutateAsync({ recordId, purchaseOrderId: o.id })
                              .then((summary) => {
                                setMatchOpen(false);
                                Alert.alert(
                                  'Matched',
                                  `Variance generated.\nMatched: ${summary.matched}\nShort: ${summary.short}\nOver: ${summary.over}\nMissing: ${summary.missing}\nExtra: ${summary.extra}`,
                                );
                              })
                              .catch((e: any) => Alert.alert('Failed', e?.message ?? 'Could not match.'));
                          },
                        },
                      ]);
                    }}
                    disabled={match.isPending}
                  >
                    <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                      {o.supplier_name ?? 'Supplier'} {o.order_number ? `• ${o.order_number}` : ''}
                    </Text>
                    <Text style={{ color: '#9aa4b2', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                      {o.order_date ?? '—'} • {o.status ?? 'draft'} • Total {Number(o.total_amount ?? 0).toFixed(2)}
                    </Text>
                  </Pressable>
                ))}
              {(orders.data ?? []).length === 0 && !orders.isLoading ? <Text style={styles.muted}>No purchase orders found.</Text> : null}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => setMatchOpen(false)}>
                <Text style={styles.btnText}>Close</Text>
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
  dangerBtn: { backgroundColor: 'rgba(239,68,68,0.18)', borderColor: 'rgba(239,68,68,0.40)' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
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
  pickRow: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 8,
  },
});

