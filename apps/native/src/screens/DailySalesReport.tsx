import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Nav = { goBack: () => void; navigate: (name: string, params?: any) => void };

type DateRange = 'today' | 'yesterday' | 'week' | 'month';

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function DailySalesReportScreen({ navigation }: { navigation: Nav }) {
  const [dateRange, setDateRange] = useState<DateRange>('today');

  // Web version is mock data; we mirror it for parity.
  const data = useMemo(() => {
    const base = {
      totalSales: 4850.75,
      transactions: 127,
      avgCheck: 38.19,
      covers: 215,
      salesByHour: [
        { hour: '11:00', sales: 320 },
        { hour: '12:00', sales: 580 },
        { hour: '13:00', sales: 620 },
        { hour: '14:00', sales: 280 },
        { hour: '15:00', sales: 150 },
        { hour: '16:00', sales: 180 },
        { hour: '17:00', sales: 350 },
        { hour: '18:00', sales: 520 },
        { hour: '19:00', sales: 680 },
        { hour: '20:00', sales: 590 },
        { hour: '21:00', sales: 420 },
        { hour: '22:00', sales: 160 },
      ],
      salesByCategory: [
        { category: 'Food', amount: 2450.5, percent: 50.5 },
        { category: 'Beverages', amount: 1820.25, percent: 37.5 },
        { category: 'Desserts', amount: 380.0, percent: 7.8 },
        { category: 'Other', amount: 200.0, percent: 4.2 },
      ],
      paymentMethods: [
        { method: 'Credit Card', amount: 3200.5, count: 85 },
        { method: 'Cash', amount: 980.25, count: 32 },
        { method: 'Debit Card', amount: 520.0, count: 8 },
        { method: 'Digital Wallet', amount: 150.0, count: 2 },
      ],
      topItems: [
        { name: 'Signature Burger', qty: 42, revenue: 588.0 },
        { name: 'House Margarita', qty: 38, revenue: 456.0 },
        { name: 'Caesar Salad', qty: 28, revenue: 336.0 },
        { name: 'Fish & Chips', qty: 25, revenue: 425.0 },
        { name: 'Craft Beer (Pint)', qty: 65, revenue: 455.0 },
      ],
    };

    const mult = dateRange === 'today' ? 1 : dateRange === 'yesterday' ? 0.92 : dateRange === 'week' ? 6.2 : 24;
    return {
      ...base,
      totalSales: base.totalSales * mult,
      transactions: Math.round(base.transactions * mult),
      covers: Math.round(base.covers * mult),
      avgCheck: base.avgCheck, // keep stable like web mock
      salesByHour: base.salesByHour.map((x) => ({ ...x, sales: Math.round(x.sales * mult) })),
      salesByCategory: base.salesByCategory.map((x) => ({ ...x, amount: Number((x.amount * mult).toFixed(2)) })),
      paymentMethods: base.paymentMethods.map((x) => ({ ...x, amount: Number((x.amount * mult).toFixed(2)), count: Math.round(x.count * mult) })),
      topItems: base.topItems.map((x) => ({ ...x, revenue: Number((x.revenue * mult).toFixed(2)), qty: Math.round(x.qty * mult) })),
    };
  }, [dateRange]);

  const peak = useMemo(() => Math.max(...data.salesByHour.map((h) => h.sales), 1), [data.salesByHour]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Daily Sales
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            End-of-day sales breakdown
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Daily Sales Summary',
              pathTemplate: '/reports/daily-sales',
            })
          }
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 12 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Period</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {(['today', 'yesterday', 'week', 'month'] as const).map((r) => (
              <Pressable key={r} style={[styles.pill, dateRange === r ? styles.pillOn : null]} onPress={() => setDateRange(r)}>
                <Text style={styles.pillText}>{r.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.muted}>Note: the current web report uses mock data; native mirrors it until connected.</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Total Sales</Text>
            <Text style={styles.metricValue}>{money(data.totalSales)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Transactions</Text>
            <Text style={styles.metricValue}>{data.transactions.toLocaleString()}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Average Check</Text>
            <Text style={styles.metricValue}>{money(data.avgCheck)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Covers</Text>
            <Text style={styles.metricValue}>{data.covers.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sales by hour</Text>
          <View style={{ gap: 10, marginTop: 10 }}>
            {data.salesByHour.map((h) => (
              <View key={h.hour} style={styles.barRow}>
                <Text style={styles.barHour}>{h.hour}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${Math.round((h.sales / peak) * 100)}%` }]} />
                </View>
                <Text style={styles.barVal}>{`$${h.sales}`}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sales by category</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {data.salesByCategory.map((c) => (
              <View key={c.category} style={styles.line}>
                <Text style={styles.lineLabel}>{c.category}</Text>
                <Text style={styles.lineValue}>
                  {money(c.amount)} • {c.percent}%
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment methods</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {data.paymentMethods.map((p) => (
              <View key={p.method} style={styles.line}>
                <Text style={styles.lineLabel}>{p.method}</Text>
                <Text style={styles.lineValue}>
                  {money(p.amount)} • {p.count}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Top selling items</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {data.topItems.map((i) => (
              <View key={i.name} style={styles.line}>
                <Text style={styles.lineLabel} numberOfLines={1}>
                  {i.name}
                </Text>
                <Text style={styles.lineValue}>
                  {i.qty} • {money(i.revenue)}
                </Text>
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
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barHour: { color: '#9aa4b2', width: 52, fontSize: 12, fontWeight: '900' },
  barTrack: { flex: 1, height: 14, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: 'rgba(59,130,246,0.75)', borderRadius: 999 },
  barVal: { color: '#fff', width: 60, textAlign: 'right', fontWeight: '800', fontSize: 12 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  lineLabel: { color: '#fff', flex: 1, paddingRight: 10 },
  lineValue: { color: '#9aa4b2', fontWeight: '800' },
});

