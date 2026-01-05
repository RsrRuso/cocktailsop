import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type Nav = { goBack: () => void; navigate: (name: string, params?: any) => void };

type Item = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
};

function money(n: number) {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function InventoryValuationReportScreen({ navigation }: { navigation: Nav }) {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'bottles' | 'cases' | 'kegs' | 'liters'>('bottles');
  const [costPerUnit, setCostPerUnit] = useState('');

  const totalValue = useMemo(() => items.reduce((s, it) => s + it.quantity * it.costPerUnit, 0), [items]);
  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) {
      m.set(it.category, (m.get(it.category) ?? 0) + it.quantity * it.costPerUnit);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  function addItem() {
    const qty = Number(quantity);
    const cost = Number(costPerUnit);
    if (!name.trim() || !category.trim() || !Number.isFinite(qty) || !Number.isFinite(cost)) {
      Alert.alert('Missing fields', 'Please fill in name, category, quantity, and cost per unit.');
      return;
    }
    if (qty <= 0 || cost < 0) {
      Alert.alert('Invalid values', 'Quantity must be > 0 and cost must be ≥ 0.');
      return;
    }
    setItems((arr) => [
      ...arr,
      { id: uid(), name: name.trim(), category: category.trim(), quantity: qty, unit, costPerUnit: cost },
    ]);
    setName('');
    setCategory('');
    setQuantity('');
    setCostPerUnit('');
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Inventory Valuation
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Complete inventory value assessment
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Inventory Valuation',
              pathTemplate: '/inventory-valuation-report',
            })
          }
        >
          <Text style={styles.btnText}>Open web PDF</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 12 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Add inventory item</Text>
          <Text style={styles.muted}>Record current stock and valuation.</Text>

          <Text style={styles.label}>Item name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="e.g., Premium Vodka" placeholderTextColor="#6b7280" style={styles.input} />

          <Text style={styles.label}>Category</Text>
          <TextInput value={category} onChangeText={setCategory} placeholder="e.g., Spirits" placeholderTextColor="#6b7280" style={styles.input} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="24" placeholderTextColor="#6b7280" style={styles.input} />
            </View>
            <View style={{ width: 120 }}>
              <Text style={styles.label}>Unit</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 6 }}>
                {(['bottles', 'cases', 'kegs', 'liters'] as const).map((u) => (
                  <Pressable key={u} style={[styles.pill, unit === u ? styles.pillOn : null]} onPress={() => setUnit(u)}>
                    <Text style={styles.pillText}>{u}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>

          <Text style={styles.label}>Cost / unit ($)</Text>
          <TextInput value={costPerUnit} onChangeText={setCostPerUnit} keyboardType="decimal-pad" placeholder="35.00" placeholderTextColor="#6b7280" style={styles.input} />

          <Pressable style={[styles.btn, styles.primaryBtn, { marginTop: 8 }]} onPress={() => addItem()}>
            <Text style={styles.btnText}>Add item</Text>
          </Pressable>
        </View>

        {items.length > 0 ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Total valuation</Text>
              <View style={styles.bigTotal}>
                <Text style={styles.bigTotalLabel}>Total inventory value</Text>
                <Text style={styles.bigTotalValue}>{money(totalValue)}</Text>
                <Text style={styles.bigTotalLabel}>{items.length} items</Text>
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Value by category</Text>
              <View style={{ gap: 8, marginTop: 10 }}>
                {byCategory.map(([cat, val]) => (
                  <View key={cat} style={styles.line}>
                    <Text style={styles.lineLabel}>{cat}</Text>
                    <Text style={styles.lineValue}>{money(val)}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Inventory items</Text>
              <View style={{ gap: 8, marginTop: 10 }}>
                {items.map((it) => (
                  <View key={it.id} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {it.name}
                      </Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {it.category} • {it.quantity} {it.unit} @ {money(it.costPerUnit)}
                      </Text>
                    </View>
                    <Text style={[styles.rowVal, { color: '#60a5fa' }]}>{money(it.quantity * it.costPerUnit)}</Text>
                  </View>
                ))}
              </View>
              <Pressable
                style={[styles.btn, styles.dangerBtn, { marginTop: 12 }]}
                onPress={() => {
                  Alert.alert('Clear inventory?', 'This will remove all items from the report.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', style: 'destructive', onPress: () => setItems([]) },
                  ]);
                }}
              >
                <Text style={styles.btnText}>Clear all</Text>
              </Pressable>
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
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  sectionTitle: { color: '#fff', fontWeight: '900' },
  muted: { color: '#9aa4b2', marginTop: 6, fontSize: 12, lineHeight: 18 },
  label: { color: '#9aa4b2', fontSize: 12, fontWeight: '900', marginTop: 10 },
  input: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  btn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { backgroundColor: 'rgba(59,130,246,0.35)', borderColor: 'rgba(59,130,246,0.55)' },
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' },
  dangerBtn: { backgroundColor: 'rgba(239,68,68,0.18)', borderColor: 'rgba(239,68,68,0.40)' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pillOn: { borderColor: 'rgba(59,130,246,0.70)', backgroundColor: 'rgba(59,130,246,0.25)' },
  pillText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  bigTotal: {
    marginTop: 10,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.35)',
    backgroundColor: 'rgba(96,165,250,0.12)',
    alignItems: 'center',
    gap: 6,
  },
  bigTotalLabel: { color: '#9aa4b2', fontWeight: '800', fontSize: 12 },
  bigTotalValue: { color: '#60a5fa', fontWeight: '900', fontSize: 28 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  lineLabel: { color: '#fff', flex: 1, paddingRight: 10 },
  lineValue: { color: '#fff', fontWeight: '900' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 10,
    borderRadius: 12,
  },
  rowTitle: { color: '#fff', fontWeight: '900' },
  rowSub: { color: '#9aa4b2', marginTop: 2, fontSize: 12 },
  rowVal: { color: '#fff', fontWeight: '900' },
});

