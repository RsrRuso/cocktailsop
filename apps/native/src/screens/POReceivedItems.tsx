import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useCreateReceivedRecord } from '../features/ops/procurement/mutations';
import { usePOReceivedRecords, useProcurementWorkspaces } from '../features/ops/procurement/queries';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

function todayYmd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function POReceivedItemsScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();
  const userId = user?.id;

  const workspaces = useProcurementWorkspaces(userId);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const wsName = useMemo(() => (workspaces.data ?? []).find((w) => w.id === workspaceId)?.name ?? null, [workspaces.data, workspaceId]);

  const records = usePOReceivedRecords(userId, workspaceId);
  const createRecord = useCreateReceivedRecord(userId, workspaceId);

  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = records.data ?? [];
    if (!query) return list;
    return list.filter((r) => {
      return (
        (r.supplier_name ?? '').toLowerCase().includes(query) ||
        (r.document_number ?? '').toLowerCase().includes(query) ||
        (r.status ?? '').toLowerCase().includes(query)
      );
    });
  }, [records.data, q]);

  const [open, setOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [receivedDate, setReceivedDate] = useState(todayYmd());
  const [totalValue, setTotalValue] = useState('');

  async function submit() {
    try {
      await createRecord.mutateAsync({
        supplierName,
        documentNumber,
        receivedDate,
        totalValue: totalValue.trim() ? Number(totalValue) : 0,
      });
      setOpen(false);
      setSupplierName('');
      setDocumentNumber('');
      setReceivedDate(todayYmd());
      setTotalValue('');
      Alert.alert('Saved', 'Received record added.');
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Could not create record.');
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
            PO Received
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {workspaceId ? `Workspace: ${wsName ?? workspaceId}` : 'Personal'}
          </Text>
        </View>
        <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => setOpen(true)} disabled={!userId}>
          <Text style={styles.btnText}>+ Add</Text>
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
          <Text style={styles.sectionTitle}>Recent received records</Text>
          <TextInput value={q} onChangeText={setQ} placeholder="Search supplier / doc # / status…" placeholderTextColor="#6b7280" style={styles.search} />
          {records.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
          {filtered.length === 0 && !records.isLoading ? <Text style={styles.muted}>No records.</Text> : null}
          <View style={{ gap: 10, marginTop: 10 }}>
            {filtered.map((r) => (
              <View key={r.id} style={styles.row}>
                <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                  {r.supplier_name ?? 'Supplier'} {r.document_number ? `• ${r.document_number}` : ''}
                </Text>
                <Text style={{ color: '#9aa4b2', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {r.received_date ?? '—'} • {r.status ?? 'completed'} • Value {Number(r.total_value ?? 0).toFixed(2)}
                </Text>
                <Pressable
                  style={[styles.btn, styles.secondaryBtn, { marginTop: 10 }]}
                  onPress={() =>
                    navigation.navigate('WebRoute', {
                      title: 'PO Received (Web)',
                      pathTemplate: '/po-received-items',
                    })
                  }
                >
                  <Text style={styles.btnText}>Open web (analytics)</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add received record</Text>
            <Text style={styles.muted} numberOfLines={1}>
              {workspaceId ? `Workspace: ${wsName ?? workspaceId}` : 'Personal'}
            </Text>
            <TextInput value={supplierName} onChangeText={setSupplierName} placeholder="Supplier name" placeholderTextColor="#6b7280" style={styles.input} />
            <TextInput value={documentNumber} onChangeText={setDocumentNumber} placeholder="Document #" placeholderTextColor="#6b7280" style={styles.input} />
            <TextInput value={receivedDate} onChangeText={setReceivedDate} placeholder="Received date (YYYY-MM-DD)" placeholderTextColor="#6b7280" style={styles.input} />
            <TextInput value={totalValue} onChangeText={setTotalValue} placeholder="Total value (optional)" placeholderTextColor="#6b7280" keyboardType="decimal-pad" style={styles.input} />
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => setOpen(false)} disabled={createRecord.isPending}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.primaryBtn]} onPress={() => submit()} disabled={createRecord.isPending}>
                <Text style={styles.btnText}>{createRecord.isPending ? 'Saving…' : 'Save'}</Text>
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

