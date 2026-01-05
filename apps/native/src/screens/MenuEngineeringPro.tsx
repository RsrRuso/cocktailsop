import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type Nav = { goBack: () => void; navigate: (name: string, params?: any) => void };

type Matrix = 'star' | 'plowhorse' | 'puzzle' | 'dog';

type ProItem = {
  id: string;
  item_name: string;
  category: string;
  selling_price: number;
  food_cost: number;
  units_sold: number;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function money(n: number) {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function clamp0(n: number) {
  return Number.isFinite(n) ? n : 0;
}

function classify(cm: number, mixPct: number, avgCm: number, avgMix: number): Matrix {
  if (cm >= avgCm && mixPct >= avgMix) return 'star';
  if (cm < avgCm && mixPct >= avgMix) return 'plowhorse';
  if (cm >= avgCm && mixPct < avgMix) return 'puzzle';
  return 'dog';
}

function badgeFor(m: Matrix) {
  switch (m) {
    case 'star':
      return { label: 'STAR', color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)' };
    case 'plowhorse':
      return { label: 'PLOWHORSE', color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)' };
    case 'puzzle':
      return { label: 'PUZZLE', color: '#c084fc', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.35)' };
    case 'dog':
      return { label: 'DOG', color: '#f87171', bg: 'rgba(239,68,68,0.14)', border: 'rgba(239,68,68,0.40)' };
  }
}

export default function MenuEngineeringProScreen({ navigation }: { navigation: Nav }) {
  const [items, setItems] = useState<ProItem[]>([]);
  const [activeTab, setActiveTab] = useState<'import' | 'items' | 'matrix'>('items');

  const [q, setQ] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [matrixFilter, setMatrixFilter] = useState<'all' | Matrix>('all');

  const [name, setName] = useState('');
  const [cat, setCat] = useState('Cocktails');
  const [sell, setSell] = useState('');
  const [cost, setCost] = useState('');
  const [units, setUnits] = useState('');

  const derived = useMemo(() => {
    const totalUnits = items.reduce((s, it) => s + clamp0(it.units_sold), 0) || 1;
    const rows = items.map((it) => {
      const selling_price = clamp0(it.selling_price);
      const food_cost = clamp0(it.food_cost);
      const units_sold = clamp0(it.units_sold);
      const revenue = selling_price * units_sold;
      const contribution_margin = selling_price - food_cost;
      const food_cost_pct = selling_price > 0 ? (food_cost / selling_price) * 100 : 0;
      const sales_mix_pct = (units_sold / totalUnits) * 100;
      return { ...it, revenue, contribution_margin, food_cost_pct, sales_mix_pct };
    });
    const avgCm = rows.reduce((s, r) => s + r.contribution_margin, 0) / (rows.length || 1);
    const avgMix = rows.reduce((s, r) => s + r.sales_mix_pct, 0) / (rows.length || 1);
    const withMatrix = rows.map((r) => ({
      ...r,
      matrix_category: classify(r.contribution_margin, r.sales_mix_pct, avgCm, avgMix),
    }));

    const totalRevenue = withMatrix.reduce((s, r) => s + r.revenue, 0);
    const totalFoodCost = withMatrix.reduce((s, r) => s + r.food_cost * r.units_sold, 0);
    const avgFoodCostPct = totalRevenue > 0 ? (totalFoodCost / totalRevenue) * 100 : 0;

    const counts = withMatrix.reduce(
      (acc, r) => {
        acc[r.matrix_category] += 1;
        return acc;
      },
      { star: 0, plowhorse: 0, puzzle: 0, dog: 0 } as Record<Matrix, number>,
    );

    return { rows: withMatrix, avgCm, avgMix, totalUnits, totalRevenue, totalFoodCost, avgFoodCostPct, counts };
  }, [items]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return derived.rows.filter((r) => {
      if (query && !(`${r.item_name} ${r.category}`.toLowerCase().includes(query))) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (matrixFilter !== 'all' && r.matrix_category !== matrixFilter) return false;
      return true;
    });
  }, [derived.rows, q, categoryFilter, matrixFilter]);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean));
    return ['all', ...Array.from(set.values()).sort()];
  }, [items]);

  function addItem() {
    if (!name.trim() || !sell.trim() || !cost.trim() || !units.trim()) {
      Alert.alert('Missing fields', 'Enter name, category, selling price, food cost, and units sold.');
      return;
    }
    const selling_price = Number(sell);
    const food_cost = Number(cost);
    const units_sold = Number(units);
    if (!Number.isFinite(selling_price) || !Number.isFinite(food_cost) || !Number.isFinite(units_sold)) {
      Alert.alert('Invalid values', 'Numbers are required for price/cost/units.');
      return;
    }
    setItems((arr) => [
      ...arr,
      {
        id: uid(),
        item_name: name.trim(),
        category: cat.trim() || 'Uncategorized',
        selling_price,
        food_cost,
        units_sold,
      },
    ]);
    setName('');
    setSell('');
    setCost('');
    setUnits('');
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Menu Engineering Pro
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Import + analyze + optimize menu items
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Menu Engineering Pro',
              pathTemplate: '/menu-engineering-pro',
            })
          }
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 12 }}>
        <View style={styles.tabs}>
          {(['items', 'matrix', 'import'] as const).map((t) => (
            <Pressable key={t} style={[styles.tab, activeTab === t ? styles.tabOn : null]} onPress={() => setActiveTab(t)}>
              <Text style={styles.tabText}>{t.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        {activeTab === 'import' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Spreadsheet import</Text>
            <Text style={styles.muted}>
              Native XLSX/CSV import + recipe ingredient editor will be added next. For now, use “Open web” to import files and edit recipes.
            </Text>
            <Pressable
              style={[styles.btn, styles.primaryBtn, { marginTop: 10 }]}
              onPress={() =>
                navigation.navigate('WebRoute', {
                  title: 'Menu Engineering Pro',
                  pathTemplate: '/menu-engineering-pro',
                })
              }
            >
              <Text style={styles.btnText}>Open web import</Text>
            </Pressable>
          </View>
        ) : null}

        {activeTab === 'items' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Add item</Text>
              <Text style={styles.muted}>Enter basic fields; the matrix is computed automatically.</Text>

              <Text style={styles.label}>Item name</Text>
              <TextInput value={name} onChangeText={setName} placeholder="e.g., Margarita" placeholderTextColor="#6b7280" style={styles.input} />

              <Text style={styles.label}>Category</Text>
              <TextInput value={cat} onChangeText={setCat} placeholder="e.g., Cocktails" placeholderTextColor="#6b7280" style={styles.input} />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Selling price</Text>
                  <TextInput value={sell} onChangeText={setSell} keyboardType="decimal-pad" placeholder="12.00" placeholderTextColor="#6b7280" style={styles.input} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Food cost</Text>
                  <TextInput value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="3.00" placeholderTextColor="#6b7280" style={styles.input} />
                </View>
              </View>

              <Text style={styles.label}>Units sold</Text>
              <TextInput value={units} onChangeText={setUnits} keyboardType="decimal-pad" placeholder="150" placeholderTextColor="#6b7280" style={styles.input} />

              <Pressable style={[styles.btn, styles.primaryBtn, { marginTop: 10 }]} onPress={() => addItem()}>
                <Text style={styles.btnText}>Add</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <View style={styles.grid}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Items</Text>
                  <Text style={styles.metricValue}>{derived.rows.length}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Total revenue</Text>
                  <Text style={styles.metricValue}>{money(derived.totalRevenue)}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Avg food cost %</Text>
                  <Text style={styles.metricValue}>{derived.avgFoodCostPct.toFixed(1)}%</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Avg CM</Text>
                  <Text style={styles.metricValue}>{money(derived.avgCm)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Items</Text>
              <TextInput value={q} onChangeText={setQ} placeholder="Search…" placeholderTextColor="#6b7280" style={styles.input} />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 6 }}>
                    {categories.map((c) => (
                      <Pressable key={c} style={[styles.pill, categoryFilter === c ? styles.pillOn : null]} onPress={() => setCategoryFilter(c)}>
                        <Text style={styles.pillText}>{c}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={{ gap: 10, marginTop: 12 }}>
                {filtered.map((r) => {
                  const b = badgeFor(r.matrix_category);
                  return (
                    <View key={r.id} style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {r.item_name}
                        </Text>
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {r.category} • Units {r.units_sold} • Revenue {money(r.revenue)}
                        </Text>
                        <Text style={styles.rowSub} numberOfLines={1}>
                          CM {money(r.contribution_margin)} • Food cost {r.food_cost_pct.toFixed(1)}% • Mix {r.sales_mix_pct.toFixed(1)}%
                        </Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: b.bg, borderColor: b.border }]}>
                        <Text style={[styles.badgeText, { color: b.color }]}>{b.label}</Text>
                      </View>
                    </View>
                  );
                })}
                {filtered.length === 0 ? <Text style={styles.muted}>No items match filters.</Text> : null}
              </View>

              {items.length > 0 ? (
                <Pressable
                  style={[styles.btn, styles.dangerBtn, { marginTop: 12 }]}
                  onPress={() =>
                    Alert.alert('Clear all?', 'Remove all items from this analysis?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Clear', style: 'destructive', onPress: () => setItems([]) },
                    ])
                  }
                >
                  <Text style={styles.btnText}>Clear</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}

        {activeTab === 'matrix' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Matrix</Text>
            <Text style={styles.muted}>Computed using average contribution margin (CM) and average sales mix %.</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
              {(Object.keys(derived.counts) as Matrix[]).map((k) => {
                const b = badgeFor(k);
                return (
                  <Pressable key={k} style={[styles.overviewBox, { backgroundColor: b.bg, borderColor: b.border }]} onPress={() => setMatrixFilter(k)}>
                    <Text style={[styles.overviewTitle, { color: b.color }]}>{b.label}</Text>
                    <Text style={[styles.overviewCount, { color: b.color }]}>{derived.counts[k]}</Text>
                    <Text style={styles.muted}>tap to filter</Text>
                  </Pressable>
                );
              })}
              <Pressable style={[styles.overviewBox, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' }]} onPress={() => setMatrixFilter('all')}>
                <Text style={[styles.overviewTitle, { color: '#fff' }]}>ALL</Text>
                <Text style={[styles.overviewCount, { color: '#fff' }]}>{derived.rows.length}</Text>
                <Text style={styles.muted}>clear filter</Text>
              </Pressable>
            </View>
            <Text style={styles.muted}>Avg CM: {money(derived.avgCm)} • Avg Mix: {derived.avgMix.toFixed(1)}%</Text>
          </View>
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
  label: { color: '#9aa4b2', fontSize: 12, fontWeight: '900' },
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
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  tabOn: { borderColor: 'rgba(59,130,246,0.70)', backgroundColor: 'rgba(59,130,246,0.25)' },
  tabText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  metric: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  metricLabel: { color: '#9aa4b2', fontSize: 12, fontWeight: '900' },
  metricValue: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 6 },
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
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontWeight: '900', fontSize: 11 },
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
  overviewBox: { width: '48%', padding: 12, borderRadius: 14, borderWidth: 1, gap: 4 },
  overviewTitle: { fontWeight: '900' },
  overviewCount: { fontWeight: '900', fontSize: 24 },
});

