import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useFifoItems } from '../features/ops/inventory/queries';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type AuditStatus = 'match' | 'over' | 'under';
type AuditItem = {
  id: string;
  itemId: string;
  name: string;
  expectedQty: number;
  actualQty: number;
  unit: string;
  value: number;
  variance: number;
  varianceValue: number;
  status: AuditStatus;
};

const UNITS = ['bottles', 'cases', 'kegs', 'liters', 'gallons'] as const;

function statusMeta(status: AuditStatus) {
  if (status === 'match') return { icon: 'checkmark-circle' as const, color: '#22c55e', bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.20)' };
  if (status === 'over') return { icon: 'alert-circle' as const, color: '#3b82f6', bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.20)' };
  return { icon: 'close-circle' as const, color: '#ef4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.20)' };
}

export default function StockAuditScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();
  const items = useFifoItems(user?.id);

  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [q, setQ] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [expectedQty, setExpectedQty] = useState('');
  const [actualQty, setActualQty] = useState('');
  const [unit, setUnit] = useState<(typeof UNITS)[number]>('bottles');
  const [unitValue, setUnitValue] = useState('');

  const selectedItem = useMemo(() => (items.data ?? []).find((it) => it.id === selectedItemId) ?? null, [items.data, selectedItemId]);
  const filteredItems = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = items.data ?? [];
    if (!query) return list;
    return list.filter((it) => `${it.name} ${it.brand ?? ''} ${it.category ?? ''}`.toLowerCase().includes(query));
  }, [items.data, q]);

  const totalVarianceValue = useMemo(() => auditItems.reduce((sum, it) => sum + it.varianceValue, 0), [auditItems]);
  const matchCount = useMemo(() => auditItems.filter((it) => it.status === 'match').length, [auditItems]);
  const overCount = useMemo(() => auditItems.filter((it) => it.status === 'over').length, [auditItems]);
  const underCount = useMemo(() => auditItems.filter((it) => it.status === 'under').length, [auditItems]);

  function addAuditItem() {
    if (!selectedItemId || !expectedQty.trim() || !actualQty.trim() || !unitValue.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (!selectedItem) return;
    const expected = Number.parseFloat(expectedQty);
    const actual = Number.parseFloat(actualQty);
    const value = Number.parseFloat(unitValue);
    if (!Number.isFinite(expected) || !Number.isFinite(actual) || !Number.isFinite(value)) {
      Alert.alert('Invalid values', 'Expected, actual, and value must be valid numbers.');
      return;
    }
    const variance = actual - expected;
    const varianceValue = variance * value;
    const status: AuditStatus = variance === 0 ? 'match' : variance > 0 ? 'over' : 'under';

    const newItem: AuditItem = {
      id: `${Date.now()}`,
      itemId: selectedItemId,
      name: selectedItem.name,
      expectedQty: expected,
      actualQty: actual,
      unit,
      value,
      variance,
      varianceValue,
      status,
    };
    setAuditItems([...auditItems, newItem]);
    setSelectedItemId('');
    setExpectedQty('');
    setActualQty('');
    setUnitValue('');
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Stock Audit
          </Text>
          <Text style={styles.sub} numberOfLines={2}>
            Physical inventory count & variance analysis.
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Stock Audit',
              pathTemplate: '/stock-audit',
            })
          }
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Add Audit Item</Text>
              <Text style={styles.muted}>Compare expected vs actual inventory levels.</Text>
            </View>
            {(items.data?.length ?? 0) === 0 ? (
              <Pressable onPress={() => navigation.navigate('MasterItems')} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>Add Master Items</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={{ height: 12 }} />

          <Text style={styles.label}>Select Item</Text>
          <Pressable onPress={() => setPickerOpen(true)} style={styles.select}>
            <Text style={{ color: selectedItem ? '#fff' : '#6b7280', fontWeight: '800' }} numberOfLines={1}>
              {selectedItem ? selectedItem.name : 'Choose from master items…'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#9aa4b2" />
          </Pressable>
          {(items.data?.length ?? 0) === 0 ? <Text style={[styles.muted, { marginTop: 8 }]}>No items found. Add items in Master Items first.</Text> : null}

          <View style={{ height: 12 }} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Expected Quantity</Text>
              <TextInput value={expectedQty} onChangeText={setExpectedQty} keyboardType="decimal-pad" placeholder="10" placeholderTextColor="#6b7280" style={styles.input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Actual Count</Text>
              <TextInput value={actualQty} onChangeText={setActualQty} keyboardType="decimal-pad" placeholder="9.5" placeholderTextColor="#6b7280" style={styles.input} />
            </View>
          </View>

          <View style={{ height: 12 }} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Unit</Text>
              <View style={styles.pillsRow}>
                {UNITS.map((u) => (
                  <Pressable key={u} onPress={() => setUnit(u)} style={[styles.pill, unit === u ? styles.pillActive : null]}>
                    <Text style={[styles.pillText, unit === u ? styles.pillTextActive : null]}>{u}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={{ width: 150 }}>
              <Text style={styles.label}>Value per Unit ($)</Text>
              <TextInput value={unitValue} onChangeText={setUnitValue} keyboardType="decimal-pad" placeholder="35.00" placeholderTextColor="#6b7280" style={styles.input} />
            </View>
          </View>

          <View style={{ height: 12 }} />

          <Pressable onPress={addAuditItem} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Add to Audit</Text>
          </Pressable>
        </View>

        {auditItems.length > 0 ? (
          <>
            <View style={{ height: 12 }} />
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Audit Summary</Text>
              <View style={{ height: 10 }} />
              <View
                style={[
                  styles.totalRow,
                  totalVarianceValue === 0
                    ? { backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.20)' }
                    : totalVarianceValue > 0
                      ? { backgroundColor: 'rgba(59,130,246,0.10)', borderColor: 'rgba(59,130,246,0.20)' }
                      : { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.20)' },
                ]}
              >
                <Text style={styles.totalLabel}>Total Variance Value</Text>
                <Text
                  style={[
                    styles.totalValue,
                    totalVarianceValue === 0 ? { color: '#22c55e' } : totalVarianceValue > 0 ? { color: '#3b82f6' } : { color: '#ef4444' },
                  ]}
                >
                  {totalVarianceValue >= 0 ? '+' : ''}${totalVarianceValue.toFixed(2)}
                </Text>
              </View>

              <View style={{ height: 10 }} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={[styles.statCard, { backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.20)' }]}>
                  <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                  <Text style={[styles.statNum, { color: '#22c55e' }]}>{matchCount}</Text>
                  <Text style={styles.statLabel}>Match</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: 'rgba(59,130,246,0.10)', borderColor: 'rgba(59,130,246,0.20)' }]}>
                  <Ionicons name="alert-circle" size={18} color="#3b82f6" />
                  <Text style={[styles.statNum, { color: '#3b82f6' }]}>{overCount}</Text>
                  <Text style={styles.statLabel}>Overage</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.20)' }]}>
                  <Ionicons name="close-circle" size={18} color="#ef4444" />
                  <Text style={[styles.statNum, { color: '#ef4444' }]}>{underCount}</Text>
                  <Text style={styles.statLabel}>Shortage</Text>
                </View>
              </View>
            </View>

            <View style={{ height: 12 }} />
            <Text style={styles.listTitle}>Audit Items</Text>
            <View style={{ height: 10 }} />
            <View style={{ gap: 10 }}>
              {auditItems.map((it) => {
                const meta = statusMeta(it.status);
                return (
                  <View key={it.id} style={[styles.card, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.entryTitle} numberOfLines={1}>
                          {it.name}
                        </Text>
                        <Text style={styles.entrySub}>${it.value.toFixed(2)} per {it.unit}</Text>
                      </View>
                      <Ionicons name={meta.icon} size={20} color={meta.color} />
                    </View>

                    <View style={{ height: 10 }} />
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.kvKey}>Expected</Text>
                        <Text style={styles.kvVal}>{it.expectedQty} {it.unit}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.kvKey}>Actual</Text>
                        <Text style={styles.kvVal}>{it.actualQty} {it.unit}</Text>
                      </View>
                    </View>

                    <View style={{ height: 10 }} />
                    <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)', paddingTop: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.kvKey}>Variance</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.kvVal, { fontWeight: '900', color: meta.color }]}>
                            {it.variance >= 0 ? '+' : ''}{it.variance.toFixed(2)} {it.unit}
                          </Text>
                          <Text style={[styles.kvVal, { fontWeight: '900', color: meta.color }]}>
                            {it.varianceValue >= 0 ? '+' : ''}${it.varianceValue.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      {pickerOpen ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Select item</Text>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color="#9aa4b2" />
              </Pressable>
            </View>
            <TextInput value={q} onChangeText={setQ} placeholder="Search items…" placeholderTextColor="#6b7280" style={[styles.input, { marginTop: 10 }]} />
            <ScrollView style={{ marginTop: 10, maxHeight: 360 }}>
              {items.isLoading ? <Text style={{ color: '#9aa4b2' }}>Loading…</Text> : null}
              {filteredItems.map((it) => (
                <Pressable
                  key={it.id}
                  style={[styles.pickItem, selectedItemId === it.id ? styles.pickItemActive : null]}
                  onPress={() => {
                    setSelectedItemId(it.id);
                    setPickerOpen(false);
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                    {it.name}
                  </Text>
                  <Text style={{ color: '#9aa4b2', marginTop: 2 }} numberOfLines={1}>
                    {it.brand ?? ''} {it.category ? `• ${it.category}` : ''}
                  </Text>
                </Pressable>
              ))}
              {!items.isLoading && filteredItems.length === 0 ? <Text style={{ color: '#9aa4b2' }}>No matches.</Text> : null}
            </ScrollView>
          </View>
        </View>
      ) : null}
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
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  secondaryBtn: {},
  btnText: { color: '#e6e6e6', fontWeight: '800', fontSize: 12 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  sectionTitle: { color: '#fff', fontWeight: '900', fontSize: 15 },
  listTitle: { color: '#fff', fontWeight: '900', fontSize: 16, paddingHorizontal: 2 },
  muted: { color: '#9aa4b2', marginTop: 6, fontSize: 12, lineHeight: 18 },
  label: { color: '#e6e6e6', fontWeight: '800', fontSize: 12, marginBottom: 6 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  select: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pillsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pillActive: { borderColor: 'rgba(251,191,36,0.35)', backgroundColor: 'rgba(251,191,36,0.12)' },
  pillText: { color: '#9aa4b2', fontWeight: '900', fontSize: 11 },
  pillTextActive: { color: '#fff' },
  primaryBtn: {
    backgroundColor: '#fbbf24',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#000', fontWeight: '900' },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  smallBtnText: { color: '#e6e6e6', fontWeight: '900', fontSize: 12 },
  totalRow: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: { color: '#e6e6e6', fontWeight: '900' },
  totalValue: { fontWeight: '900', fontSize: 20 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statNum: { fontSize: 20, fontWeight: '900' },
  statLabel: { color: '#9aa4b2', fontSize: 11, fontWeight: '800' },
  entryTitle: { color: '#fff', fontWeight: '900', fontSize: 14 },
  entrySub: { color: '#9aa4b2', fontSize: 12, marginTop: 2 },
  kvKey: { color: '#9aa4b2', fontSize: 12 },
  kvVal: { color: '#e6e6e6', fontSize: 12, fontWeight: '700', marginTop: 2 },
  modalOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 12,
    justifyContent: 'center',
  },
  modal: {
    backgroundColor: '#0b1220',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 12,
  },
  pickItem: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 8,
  },
  pickItemActive: { borderColor: 'rgba(251,191,36,0.35)', backgroundColor: 'rgba(251,191,36,0.10)' },
});

