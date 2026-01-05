import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Nav = { goBack: () => void; navigate: (name: string, params?: any) => void };
type DateRange = 'today' | 'yesterday' | 'week' | 'month';

function money(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

function pillColor(type: string) {
  if (type === 'success') return { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', text: '#34d399' };
  if (type === 'warning') return { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', text: '#fbbf24' };
  if (type === 'info') return { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', text: '#60a5fa' };
  return { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.14)', text: '#fff' };
}

export default function DailyOpsReportScreen({ navigation }: { navigation: Nav }) {
  const [dateRange, setDateRange] = useState<DateRange>('today');

  // Web version is mock data; mirror it.
  const data = useMemo(() => {
    const base = {
      summary: { totalRevenue: 4850, totalCovers: 215, avgCheck: 22.56, laborCost: 850, laborPercent: 17.5 },
      shifts: [
        { name: 'Morning', hours: '6am-2pm', staff: 4, revenue: 1200, covers: 65 },
        { name: 'Afternoon', hours: '2pm-10pm', staff: 8, revenue: 2800, covers: 110 },
        { name: 'Night', hours: '10pm-2am', staff: 3, revenue: 850, covers: 40 },
      ],
      highlights: [
        { type: 'success', message: 'Revenue up 12% vs last week' },
        { type: 'success', message: 'Labor cost under target (17.5% vs 20%)' },
        { type: 'warning', message: '3 inventory items below par level' },
        { type: 'info', message: '2 new staff completed training' },
      ],
      issues: [
        { time: '14:30', issue: 'POS system slow', status: 'resolved', resolution: 'Restarted terminal' },
        { time: '19:45', issue: 'Kitchen ticket printer jam', status: 'resolved', resolution: 'Cleared paper jam' },
        { time: '21:00', issue: 'AC unit malfunction', status: 'pending', resolution: 'Maintenance called' },
      ],
    };

    const mult = dateRange === 'today' ? 1 : dateRange === 'yesterday' ? 0.93 : dateRange === 'week' ? 6.4 : 24;
    return {
      summary: {
        totalRevenue: base.summary.totalRevenue * mult,
        totalCovers: Math.round(base.summary.totalCovers * mult),
        avgCheck: base.summary.avgCheck,
        laborCost: base.summary.laborCost * mult,
        laborPercent: base.summary.laborPercent,
      },
      shifts: base.shifts.map((s) => ({ ...s, revenue: s.revenue * mult, covers: Math.round(s.covers * mult), staff: s.staff })),
      highlights: base.highlights,
      issues: base.issues,
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
            Daily Ops
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Daily operations summary
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Daily Operations Summary',
              pathTemplate: '/reports/daily-ops',
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
            <Text style={styles.metricLabel}>Total Revenue</Text>
            <Text style={[styles.metricValue, { color: '#34d399' }]}>{money(data.summary.totalRevenue)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Covers</Text>
            <Text style={styles.metricValue}>{data.summary.totalCovers.toLocaleString()}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Avg Check</Text>
            <Text style={styles.metricValue}>{`$${data.summary.avgCheck.toFixed(2)}`}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Labor Cost</Text>
            <Text style={[styles.metricValue, { color: '#fbbf24' }]}>{money(data.summary.laborCost)}</Text>
          </View>
          <View style={styles.metricWide}>
            <Text style={styles.metricLabel}>Labor %</Text>
            <Text style={styles.metricValue}>{data.summary.laborPercent.toFixed(1)}%</Text>
            <Text style={styles.muted}>Target improvement shown in web; kept constant here.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Shift breakdown</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {data.shifts.map((s) => (
              <View key={s.name} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{s.name}</Text>
                  <Text style={styles.rowSub}>
                    {s.hours} • Staff {s.staff}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.rowVal}>{money(s.revenue)}</Text>
                  <Text style={styles.rowSub}>{`${s.covers} covers`}</Text>
                </View>
              </View>
            ))}
            <View style={[styles.row, styles.rowTotal]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { fontWeight: '900' }]}>Total</Text>
                <Text style={styles.rowSub}>{`${data.shifts.reduce((a, b) => a + b.staff, 0)} staff`}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.rowVal, { fontWeight: '900', color: '#34d399' }]}>{money(data.summary.totalRevenue)}</Text>
                <Text style={styles.rowSub}>{`${data.summary.totalCovers} covers`}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Daily highlights</Text>
          <View style={{ gap: 10, marginTop: 10 }}>
            {data.highlights.map((h, idx) => {
              const c = pillColor(h.type);
              return (
                <View key={idx} style={[styles.notice, { backgroundColor: c.bg, borderColor: c.border }]}>
                  <Text style={{ color: c.text, fontWeight: '900' }}>{h.message}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Issues & resolutions</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {data.issues.map((i, idx) => (
              <View key={`${i.time}-${idx}`} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {i.issue}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {i.time} • {i.resolution}
                  </Text>
                </View>
                <View style={[styles.statusPill, i.status === 'resolved' ? styles.statusOk : styles.statusBad]}>
                  <Text style={styles.statusText}>{i.status.toUpperCase()}</Text>
                </View>
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
  metricWide: {
    width: '100%',
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
  rowTotal: { borderColor: 'rgba(34,197,94,0.35)', backgroundColor: 'rgba(34,197,94,0.10)' },
  rowTitle: { color: '#fff', fontWeight: '900' },
  rowSub: { color: '#9aa4b2', marginTop: 2, fontSize: 12 },
  rowVal: { color: '#fff', fontWeight: '900' },
  notice: { padding: 10, borderRadius: 12, borderWidth: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  statusOk: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.35)' },
  statusBad: { backgroundColor: 'rgba(239,68,68,0.18)', borderColor: 'rgba(239,68,68,0.40)' },
  statusText: { color: '#fff', fontWeight: '900', fontSize: 11 },
});

