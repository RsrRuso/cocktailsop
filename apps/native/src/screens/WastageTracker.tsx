import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type WastageEntry = {
  id: string;
  date: string;
  item: string;
  quantity: number;
  unit: string;
  cost: number;
  reason: string;
  totalCost: number;
};

const UNITS = ['oz', 'ml', 'bottles', 'cases', 'lbs', 'kg'] as const;
const REASONS = ['Expired', 'Spillage', 'Over-portioning', 'Damaged', 'Contaminated', 'Returned', 'Prep Error', 'Other'] as const;

export default function WastageTrackerScreen({ navigation }: { navigation: Nav }) {
  const [entries, setEntries] = useState<WastageEntry[]>([]);
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<(typeof UNITS)[number]>('oz');
  const [cost, setCost] = useState('');
  const [reason, setReason] = useState<(typeof REASONS)[number] | ''>('');

  const totalWastage = useMemo(() => entries.reduce((sum, e) => sum + e.totalCost, 0), [entries]);
  const wastageByReason = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const e of entries) acc[e.reason] = (acc[e.reason] ?? 0) + e.totalCost;
    return acc;
  }, [entries]);

  function handleAddEntry() {
    const trimmedItem = item.trim();
    const trimmedQty = quantity.trim();
    const trimmedCost = cost.trim();
    if (!trimmedItem || !trimmedQty || !trimmedCost || !reason) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }

    const qty = Number.parseFloat(trimmedQty);
    const costPerUnit = Number.parseFloat(trimmedCost);
    if (!Number.isFinite(qty) || qty <= 0) {
      Alert.alert('Invalid quantity', 'Quantity must be a positive number.');
      return;
    }
    if (!Number.isFinite(costPerUnit) || costPerUnit < 0) {
      Alert.alert('Invalid cost', 'Cost per unit must be a number (0 or greater).');
      return;
    }

    const totalCost = qty * costPerUnit;
    const newEntry: WastageEntry = {
      id: `${Date.now()}`,
      date: new Date().toLocaleDateString(),
      item: trimmedItem,
      quantity: qty,
      unit,
      cost: costPerUnit,
      reason,
      totalCost,
    };

    setEntries([newEntry, ...entries]);
    setItem('');
    setQuantity('');
    setCost('');
    setReason('');
  }

  function handleDeleteEntry(id: string) {
    setEntries(entries.filter((e) => e.id !== id));
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Wastage Tracker
          </Text>
          <Text style={styles.sub} numberOfLines={2}>
            Monitor and reduce operational waste.
          </Text>
        </View>
        <Pressable
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Wastage tracker',
              pathTemplate: '/wastage-tracker',
            })
          }
          style={styles.webBtn}
        >
          <Text style={styles.webBtnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Log Wastage</Text>
          <Text style={styles.muted}>Record waste to identify patterns and reduce costs.</Text>

          <View style={{ height: 12 }} />

          <Text style={styles.label}>Item Name</Text>
          <TextInput
            value={item}
            onChangeText={setItem}
            placeholder="e.g., Lime Juice"
            placeholderTextColor="#6b7280"
            style={styles.input}
          />

          <View style={{ height: 12 }} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                placeholder="10"
                placeholderTextColor="#6b7280"
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>
            <View style={{ width: 120 }}>
              <Text style={styles.label}>Unit</Text>
              <View style={styles.pillsRow}>
                {UNITS.slice(0, 3).map((u) => (
                  <Pressable key={u} onPress={() => setUnit(u)} style={[styles.pill, unit === u ? styles.pillActive : null]}>
                    <Text style={[styles.pillText, unit === u ? styles.pillTextActive : null]}>{u}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={[styles.pillsRow, { marginTop: 6 }]}>
                {UNITS.slice(3).map((u) => (
                  <Pressable key={u} onPress={() => setUnit(u)} style={[styles.pill, unit === u ? styles.pillActive : null]}>
                    <Text style={[styles.pillText, unit === u ? styles.pillTextActive : null]}>{u}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View style={{ height: 12 }} />

          <Text style={styles.label}>Cost per Unit ($)</Text>
          <TextInput
            value={cost}
            onChangeText={setCost}
            placeholder="2.50"
            placeholderTextColor="#6b7280"
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <View style={{ height: 12 }} />

          <Text style={styles.label}>Reason</Text>
          <View style={styles.reasonWrap}>
            {REASONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => setReason(r)}
                style={[styles.reasonChip, reason === r ? styles.reasonChipActive : null]}
              >
                <Text style={[styles.reasonChipText, reason === r ? styles.reasonChipTextActive : null]}>{r}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ height: 12 }} />

          <Pressable onPress={handleAddEntry} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Log Wastage</Text>
          </Pressable>
        </View>

        {entries.length > 0 ? (
          <>
            <View style={{ height: 12 }} />

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <View style={{ height: 10 }} />
              <View style={styles.totalRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="alert-circle" size={18} color="#ef4444" />
                  <Text style={styles.totalLabel}>Total Wastage</Text>
                </View>
                <Text style={styles.totalValue}>${totalWastage.toFixed(2)}</Text>
              </View>

              <View style={{ height: 10 }} />

              <Text style={styles.smallTitle}>Wastage by Reason</Text>
              <View style={{ height: 6 }} />
              {Object.entries(wastageByReason).map(([k, v]) => (
                <View key={k} style={styles.kvRow}>
                  <Text style={styles.kvKey}>{k}</Text>
                  <Text style={styles.kvVal}>${v.toFixed(2)}</Text>
                </View>
              ))}
            </View>

            <View style={{ height: 12 }} />

            <Text style={styles.listTitle}>Recent Entries</Text>
            <View style={{ height: 10 }} />
            <View style={{ gap: 10 }}>
              {entries.map((e) => (
                <View key={e.id} style={styles.card}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entryTitle} numberOfLines={1}>
                        {e.item}
                      </Text>
                      <Text style={styles.entryDate}>{e.date}</Text>
                    </View>
                    <Pressable
                      onPress={() =>
                        Alert.alert('Delete entry?', 'This will remove the wastage entry.', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => handleDeleteEntry(e.id) },
                        ])
                      }
                      hitSlop={10}
                      style={styles.iconBtn}
                    >
                      <Ionicons name="trash" size={18} color="#ef4444" />
                    </Pressable>
                  </View>

                  <View style={{ height: 10 }} />
                  <View style={styles.kvRow}>
                    <Text style={styles.kvKey}>Quantity</Text>
                    <Text style={styles.kvVal}>
                      {e.quantity} {e.unit}
                    </Text>
                  </View>
                  <View style={styles.kvRow}>
                    <Text style={styles.kvKey}>Cost per unit</Text>
                    <Text style={styles.kvVal}>${e.cost.toFixed(2)}</Text>
                  </View>
                  <View style={styles.kvRow}>
                    <Text style={styles.kvKey}>Reason</Text>
                    <Text style={styles.kvVal}>{e.reason}</Text>
                  </View>
                  <View style={[styles.kvRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 10, marginTop: 6 }]}>
                    <Text style={[styles.kvVal, { fontWeight: '900' }]}>Total Cost</Text>
                    <Text style={[styles.kvVal, { color: '#ef4444', fontWeight: '900' }]}>${e.totalCost.toFixed(2)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
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
  webBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  webBtnText: { color: '#e6e6e6', fontWeight: '800', fontSize: 12 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  sectionTitle: { color: '#fff', fontWeight: '900', fontSize: 15 },
  smallTitle: { color: '#e6e6e6', fontWeight: '900' },
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
  reasonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  reasonChipActive: { borderColor: 'rgba(251,191,36,0.35)', backgroundColor: 'rgba(251,191,36,0.12)' },
  reasonChipText: { color: '#9aa4b2', fontWeight: '900', fontSize: 11 },
  reasonChipTextActive: { color: '#fff' },
  primaryBtn: {
    backgroundColor: '#fbbf24',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#000', fontWeight: '900' },
  totalRow: {
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: { color: '#e6e6e6', fontWeight: '900' },
  totalValue: { color: '#ef4444', fontWeight: '900', fontSize: 20 },
  kvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  kvKey: { color: '#9aa4b2', fontSize: 12 },
  kvVal: { color: '#e6e6e6', fontSize: 12, fontWeight: '700' },
  entryTitle: { color: '#fff', fontWeight: '900', fontSize: 14 },
  entryDate: { color: '#9aa4b2', fontSize: 12, marginTop: 2 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

