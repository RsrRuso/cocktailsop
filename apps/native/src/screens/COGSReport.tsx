import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Nav = { goBack: () => void; navigate: (name: string, params?: any) => void };

type DateRange = 'month' | 'quarter' | 'year';

function money(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

export default function COGSReportScreen({ navigation }: { navigation: Nav }) {
  const [dateRange, setDateRange] = useState<DateRange>('month');

  // Web version is mock data; we mirror it here.
  const data = useMemo(() => {
    const mult = dateRange === 'month' ? 1 : dateRange === 'quarter' ? 3 : 12;
    const base = {
      totalCOGS: 21500,
      cogsPercent: 26.9,
      revenue: 80000,
      grossProfit: 58500,
      categories: [
        { name: 'Spirits', opening: 8000, purchases: 5500, closing: 6500, cogs: 7000 },
        { name: 'Beer', opening: 2500, purchases: 2000, closing: 2200, cogs: 2300 },
        { name: 'Wine', opening: 4000, purchases: 3000, closing: 3500, cogs: 3500 },
        { name: 'Food', opening: 3000, purchases: 12000, closing: 2500, cogs: 12500 },
        { name: 'Non-Alcoholic', opening: 1000, purchases: 1500, closing: 700, cogs: 1800 },
        { name: 'Supplies', opening: 500, purchases: 800, closing: 400, cogs: 900 },
      ],
      topCostItems: [
        { item: 'Premium Vodka', cost: 1200, units: 48, costPerUnit: 25 },
        { item: 'Ribeye Steak', cost: 980, units: 35, costPerUnit: 28 },
        { item: 'Champagne', cost: 850, units: 17, costPerUnit: 50 },
        { item: 'Fresh Seafood', cost: 750, units: 50, costPerUnit: 15 },
        { item: 'Premium Whiskey', cost: 680, units: 20, costPerUnit: 34 },
      ],
    };

    return {
      ...base,
      totalCOGS: base.totalCOGS * mult,
      revenue: base.revenue * mult,
      grossProfit: base.grossProfit * mult,
      cogsPercent: base.cogsPercent,
      categories: base.categories.map((c) => ({ ...c, opening: c.opening * mult, purchases: c.purchases * mult, closing: c.closing * mult, cogs: c.cogs * mult })),
      topCostItems: base.topCostItems.map((i) => ({ ...i, cost: i.cost * mult })),
    };
  }, [dateRange]);

  const totals = useMemo(() => {
    const opening = data.categories.reduce((a, b) => a + b.opening, 0);
    const purchases = data.categories.reduce((a, b) => a + b.purchases, 0);
    const closing = data.categories.reduce((a, b) => a + b.closing, 0);
    return { opening, purchases, closing };
  }, [data.categories]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            COGS
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Cost of goods sold breakdown
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Cost of Goods Sold',
              pathTemplate: '/reports/cogs',
            })
          }
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 12 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Period</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {(['month', 'quarter', 'year'] as const).map((r) => (
              <Pressable key={r} style={[styles.pill, dateRange === r ? styles.pillOn : null]} onPress={() => setDateRange(r)}>
                <Text style={styles.pillText}>{r.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.muted}>Note: the current web report uses mock data; native mirrors it until connected.</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Total COGS</Text>
            <Text style={styles.metricValue}>{money(data.totalCOGS)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>COGS %</Text>
            <Text style={styles.metricValue}>{data.cogsPercent.toFixed(1)}%</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Revenue</Text>
            <Text style={styles.metricValue}>{money(data.revenue)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Gross Profit</Text>
            <Text style={styles.metricValue}>{money(data.grossProfit)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>COGS by category</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {data.categories.map((c) => (
              <View key={c.name} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{c.name}</Text>
                  <Text style={styles.rowSub}>
                    Opening {money(c.opening)} • Purchases {money(c.purchases)} • Closing {money(c.closing)}
                  </Text>
                </View>
                <Text style={styles.rowVal}>{money(c.cogs)}</Text>
              </View>
            ))}
            <View style={[styles.row, styles.rowTotal]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { fontWeight: '900' }]}>Total</Text>
                <Text style={styles.rowSub}>
                  Opening {money(totals.opening)} • Purchases {money(totals.purchases)} • Closing {money(totals.closing)}
                </Text>
              </View>
              <Text style={[styles.rowVal, { fontWeight: '900', color: '#60a5fa' }]}>{money(data.totalCOGS)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>COGS calculation</Text>
          <Text style={styles.muted}>COGS = Opening Inventory + Purchases − Closing Inventory</Text>
          <View style={{ marginTop: 10, gap: 8 }}>
            {[
              ['Opening inventory', totals.opening],
              ['+ Purchases', totals.purchases],
              ['− Closing inventory', totals.closing],
            ].map(([label, val]) => (
              <View key={label} style={styles.line}>
                <Text style={styles.lineLabel}>{label}</Text>
                <Text style={styles.lineValue}>{money(val as number)}</Text>
              </View>
            ))}
            <View style={[styles.line, styles.lineTotal]}>
              <Text style={[styles.lineLabel, { fontWeight: '900' }]}>= Total COGS</Text>
              <Text style={[styles.lineValue, { fontWeight: '900', color: '#60a5fa' }]}>{money(data.totalCOGS)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Top cost items</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {data.topCostItems.map((i, idx) => (
              <View key={i.item} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{`${idx + 1}. ${i.item}`}</Text>
                  <Text style={styles.rowSub}>
                    Units {i.units} • ${i.costPerUnit}/unit
                  </Text>
                </View>
                <Text style={styles.rowVal}>{money(i.cost)}</Text>
              </View>
            ))}
          </View>
        </View>
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
  muted: { color: '#9aa4b2', marginTop: 8, fontSize: 12, lineHeight: 18 },
  btn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' },
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
  pillText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  metricLabel: { color: '#9aa4b2', fontSize: 12, fontWeight: '900' },
  metricValue: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 6 },
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
  rowTotal: { borderColor: 'rgba(59,130,246,0.40)', backgroundColor: 'rgba(59,130,246,0.12)' },
  rowTitle: { color: '#fff', fontWeight: '800' },
  rowSub: { color: '#9aa4b2', marginTop: 2, fontSize: 12 },
  rowVal: { color: '#fff', fontWeight: '900' },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  lineTotal: { borderBottomWidth: 0, marginTop: 6, paddingTop: 10 },
  lineLabel: { color: '#fff', flex: 1, paddingRight: 10 },
  lineValue: { color: '#fff', fontWeight: '900' },
});

