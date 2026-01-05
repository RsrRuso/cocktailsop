import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Nav = { goBack: () => void; navigate: (name: string, params?: any) => void };
type DateRange = 'week' | 'month' | 'quarter' | 'year';

function badgeColor(type: string) {
  if (type === 'in') return { bg: 'rgba(34,197,94,0.20)', border: 'rgba(34,197,94,0.45)', text: '#86efac' };
  if (type === 'out') return { bg: 'rgba(239,68,68,0.18)', border: 'rgba(239,68,68,0.40)', text: '#fca5a5' };
  if (type === 'adjust') return { bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.40)', text: '#fbbf24' };
  if (type === 'transfer') return { bg: 'rgba(59,130,246,0.18)', border: 'rgba(59,130,246,0.40)', text: '#93c5fd' };
  return { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.14)', text: '#fff' };
}

export default function StockMovementReportScreen({ navigation }: { navigation: Nav }) {
  const [dateRange, setDateRange] = useState<DateRange>('week');

  // Web version is mock data; we mirror it here.
  const data = useMemo(() => {
    const base = {
      totalIn: 485,
      totalOut: 392,
      adjustments: 12,
      netChange: 81,
      movements: [
        { date: '2024-01-15', item: 'Grey Goose Vodka', type: 'in', qty: 24, source: 'Purchase Order #1234' },
        { date: '2024-01-15', item: 'Grey Goose Vodka', type: 'out', qty: 8, source: 'Bar Usage' },
        { date: '2024-01-14', item: 'Hendricks Gin', type: 'in', qty: 12, source: 'Purchase Order #1233' },
        { date: '2024-01-14', item: 'Patron Silver', type: 'out', qty: 15, source: 'Bar Usage' },
        { date: '2024-01-14', item: 'Jameson Whiskey', type: 'adjust', qty: -2, source: 'Spillage' },
        { date: '2024-01-13', item: 'Absolut Vodka', type: 'in', qty: 36, source: 'Purchase Order #1232' },
        { date: '2024-01-13', item: 'Bacardi White', type: 'out', qty: 18, source: 'Bar Usage' },
        { date: '2024-01-13', item: 'Jack Daniels', type: 'transfer', qty: 6, source: 'To Outdoor Bar' },
      ],
      topMovers: [
        { item: 'Grey Goose Vodka', inQty: 48, outQty: 42, net: 6 },
        { item: 'Patron Silver', inQty: 24, outQty: 28, net: -4 },
        { item: 'Hendricks Gin', inQty: 36, outQty: 32, net: 4 },
        { item: 'Absolut Vodka', inQty: 72, outQty: 65, net: 7 },
        { item: 'Bacardi White', inQty: 48, outQty: 52, net: -4 },
      ],
    };

    const mult = dateRange === 'week' ? 1 : dateRange === 'month' ? 4.2 : dateRange === 'quarter' ? 12.6 : 50;
    return {
      totalIn: Math.round(base.totalIn * mult),
      totalOut: Math.round(base.totalOut * mult),
      adjustments: Math.round(base.adjustments * mult),
      netChange: Math.round(base.netChange * mult),
      movements: base.movements,
      topMovers: base.topMovers,
    };
  }, [dateRange]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Stock Movement
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Inventory in/out movements
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Stock Movement Report',
              pathTemplate: '/reports/stock-movement',
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
            {(['week', 'month', 'quarter', 'year'] as const).map((r) => (
              <Pressable key={r} style={[styles.pill, dateRange === r ? styles.pillOn : null]} onPress={() => setDateRange(r)}>
                <Text style={styles.pillText}>{r.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.muted}>Note: the current web report uses mock data; native mirrors it until connected.</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Total In</Text>
            <Text style={[styles.metricValue, { color: '#34d399' }]}>{`+${data.totalIn}`}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Total Out</Text>
            <Text style={[styles.metricValue, { color: '#f87171' }]}>{`-${data.totalOut}`}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Adjustments</Text>
            <Text style={[styles.metricValue, { color: '#fbbf24' }]}>{data.adjustments}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Net Change</Text>
            <Text style={[styles.metricValue, { color: data.netChange >= 0 ? '#60a5fa' : '#fbbf24' }]}>{`${data.netChange >= 0 ? '+' : ''}${data.netChange}`}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Movement log</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {data.movements.map((m, idx) => {
              const c = badgeColor(m.type);
              const sign = m.type === 'in' ? '+' : m.type === 'out' ? '-' : '';
              const qtyText = `${sign}${Math.abs(m.qty)}`;
              return (
                <View key={`${m.date}-${m.item}-${idx}`} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {m.item}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {m.date} • {m.source}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
                      <Text style={[styles.badgeText, { color: c.text }]}>{m.type.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={[styles.rowVal, { color: m.type === 'in' ? '#34d399' : m.type === 'out' ? '#f87171' : '#fff' }]}>{qtyText}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Top moving items</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {data.topMovers.map((t) => (
              <View key={t.item} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {t.item}
                  </Text>
                  <Text style={styles.rowSub}>
                    In +{t.inQty} • Out -{t.outQty} • Net {t.net >= 0 ? '+' : ''}
                    {t.net}
                  </Text>
                </View>
                <Text style={[styles.rowVal, { color: t.net >= 0 ? '#60a5fa' : '#fbbf24' }]}>{t.net >= 0 ? `+${t.net}` : String(t.net)}</Text>
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
  rowTitle: { color: '#fff', fontWeight: '900' },
  rowSub: { color: '#9aa4b2', marginTop: 2, fontSize: 12 },
  rowVal: { color: '#fff', fontWeight: '900' },
  badge: { marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontWeight: '900', fontSize: 11 },
});

