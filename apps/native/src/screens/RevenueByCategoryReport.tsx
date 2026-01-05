import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Nav = { goBack: () => void; navigate: (name: string, params?: any) => void };
type DateRange = 'week' | 'month' | 'quarter' | 'year';

function money(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

function rowColor(name: string) {
  // Mirrors web-ish palette; used for swatches/bars.
  const map: Record<string, string> = {
    Cocktails: '#a855f7',
    Food: '#f59e0b',
    Beer: '#eab308',
    Wine: '#ef4444',
    'Spirits (Neat)': '#3b82f6',
    'Non-Alcoholic': '#22c55e',
  };
  return map[name] ?? '#60a5fa';
}

export default function RevenueByCategoryReportScreen({ navigation }: { navigation: Nav }) {
  const [dateRange, setDateRange] = useState<DateRange>('month');

  // Web version is mock data; mirror it.
  const data = useMemo(() => {
    const base = {
      totalRevenue: 80000,
      categories: [
        { name: 'Cocktails', revenue: 28000, percent: 35, trend: 12 },
        { name: 'Food', revenue: 24000, percent: 30, trend: 8 },
        { name: 'Beer', revenue: 12000, percent: 15, trend: -2 },
        { name: 'Wine', revenue: 8000, percent: 10, trend: 5 },
        { name: 'Spirits (Neat)', revenue: 4800, percent: 6, trend: 15 },
        { name: 'Non-Alcoholic', revenue: 3200, percent: 4, trend: 20 },
      ],
      timeOfDay: [
        { period: 'Lunch (11am-3pm)', revenue: 16000, percent: 20 },
        { period: 'Happy Hour (3pm-6pm)', revenue: 12000, percent: 15 },
        { period: 'Dinner (6pm-9pm)', revenue: 32000, percent: 40 },
        { period: 'Late Night (9pm-2am)', revenue: 20000, percent: 25 },
      ],
    };

    const mult = dateRange === 'week' ? 0.25 : dateRange === 'month' ? 1 : dateRange === 'quarter' ? 3 : 12;
    return {
      totalRevenue: base.totalRevenue * mult,
      categories: base.categories.map((c) => ({ ...c, revenue: c.revenue * mult })),
      timeOfDay: base.timeOfDay.map((t) => ({ ...t, revenue: t.revenue * mult })),
    };
  }, [dateRange]);

  const topCategory = useMemo(() => data.categories.slice().sort((a, b) => b.revenue - a.revenue)[0] ?? null, [data.categories]);
  const avgCategory = useMemo(() => (data.categories.length ? data.totalRevenue / data.categories.length : 0), [data.totalRevenue, data.categories.length]);
  const peak = useMemo(() => data.timeOfDay.slice().sort((a, b) => b.revenue - a.revenue)[0] ?? null, [data.timeOfDay]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Revenue by Category
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Analyze revenue streams by category
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Revenue by Category',
              pathTemplate: '/reports/revenue-category',
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
            <Text style={styles.metricLabel}>Total Revenue</Text>
            <Text style={styles.metricValue}>{money(data.totalRevenue)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Top Category</Text>
            <Text style={styles.metricValue} numberOfLines={1}>
              {topCategory?.name ?? '—'}
            </Text>
            <Text style={styles.metricSub} numberOfLines={1}>
              {topCategory ? `${topCategory.percent}% of revenue` : ''}
            </Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Categories</Text>
            <Text style={styles.metricValue}>{data.categories.length}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Avg Category</Text>
            <Text style={styles.metricValue}>{money(avgCategory)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Category breakdown</Text>
          <View style={{ gap: 12, marginTop: 10 }}>
            {data.categories.map((c) => (
              <View key={c.name} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {money(c.revenue)} ({c.percent}%)
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${c.percent}%`, backgroundColor: rowColor(c.name) }]} />
                </View>
                <Text style={[styles.muted, { marginTop: 0, color: c.trend >= 0 ? '#34d399' : '#f87171' }]}>
                  {c.trend >= 0 ? '↑' : '↓'} {Math.abs(c.trend)}% vs last period
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Revenue by time of day</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {data.timeOfDay.map((t) => (
              <View key={t.period} style={styles.line}>
                <Text style={styles.lineLabel} numberOfLines={1}>
                  {t.period}
                </Text>
                <Text style={styles.lineValue}>
                  {money(t.revenue)} • {t.percent}%
                </Text>
              </View>
            ))}
          </View>
          {peak ? (
            <View style={styles.highlight}>
              <Text style={styles.highlightLabel}>Peak revenue period</Text>
              <Text style={styles.highlightTitle}>{peak.period}</Text>
              <Text style={styles.muted}>{peak.percent}% of daily revenue</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Detailed category analysis</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {data.categories.map((c) => (
              <View key={`detail-${c.name}`} style={styles.detailRow}>
                <View style={[styles.dot, { backgroundColor: rowColor(c.name) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    Trend: {c.trend >= 0 ? '+' : ''}
                    {c.trend}% • Avg txn: {(c.revenue / 100).toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.rowVal}>{money(c.revenue)}</Text>
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
  metricSub: { color: '#9aa4b2', marginTop: 4, fontSize: 12 },
  rowTitle: { color: '#fff', fontWeight: '900' },
  rowSub: { color: '#9aa4b2', fontSize: 12, fontWeight: '800' },
  rowVal: { color: '#fff', fontWeight: '900' },
  barTrack: { height: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  lineLabel: { color: '#fff', flex: 1, paddingRight: 10 },
  lineValue: { color: '#9aa4b2', fontWeight: '800' },
  highlight: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.40)',
    backgroundColor: 'rgba(59,130,246,0.12)',
    gap: 4,
  },
  highlightLabel: { color: '#9aa4b2', fontSize: 12, fontWeight: '900' },
  highlightTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 10,
    borderRadius: 12,
  },
  dot: { width: 10, height: 10, borderRadius: 999 },
});

