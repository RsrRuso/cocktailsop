import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Nav = { goBack: () => void; navigate: (name: string, params?: any) => void };

type DateRange = 'month' | 'quarter' | 'year';

function money(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

export default function LaborCostReportScreen({ navigation }: { navigation: Nav }) {
  const [dateRange, setDateRange] = useState<DateRange>('month');

  // Web version is mock data; we mirror it here.
  const data = useMemo(() => {
    const mult = dateRange === 'month' ? 1 : dateRange === 'quarter' ? 3 : 12;
    const base = {
      totalLaborCost: 24000,
      laborPercent: 30,
      revenue: 80000,
      totalHours: 1200,
      salesPerLaborHour: 66.67,
      costPerCover: 11.16,
      covers: 2150,
      departments: [
        { name: 'Front of House', employees: 12, hours: 520, wages: 9360, tips: 4800 },
        { name: 'Back of House', employees: 8, hours: 480, wages: 8640, tips: 0 },
        { name: 'Management', employees: 3, hours: 200, wages: 6000, tips: 0 },
      ],
      overtime: { hours: 45, cost: 1350, employees: 5 },
      byRole: [
        { role: 'Server', count: 6, avgWage: 12, hours: 280, total: 3360 },
        { role: 'Bartender', count: 4, avgWage: 15, hours: 200, total: 3000 },
        { role: 'Line Cook', count: 4, avgWage: 16, hours: 240, total: 3840 },
        { role: 'Prep Cook', count: 2, avgWage: 14, hours: 120, total: 1680 },
        { role: 'Host', count: 2, avgWage: 11, hours: 80, total: 880 },
        { role: 'Dishwasher', count: 2, avgWage: 12, hours: 120, total: 1440 },
        { role: 'Manager', count: 3, avgWage: 30, hours: 160, total: 4800 },
      ],
    };

    const totalLaborCost = base.totalLaborCost * mult;
    const revenue = base.revenue * mult;
    const totalHours = base.totalHours * mult;
    const covers = base.covers * mult;
    return {
      ...base,
      totalLaborCost,
      revenue,
      totalHours,
      covers,
      laborPercent: base.laborPercent, // keep stable like web mock
      salesPerLaborHour: base.salesPerLaborHour,
      costPerCover: base.costPerCover,
      departments: base.departments.map((d) => ({ ...d, employees: d.employees, hours: d.hours * mult, wages: d.wages * mult, tips: d.tips * mult })),
      overtime: { ...base.overtime, hours: base.overtime.hours * mult, cost: base.overtime.cost * mult, employees: base.overtime.employees },
      byRole: base.byRole.map((r) => ({ ...r, count: r.count, hours: r.hours * mult, total: r.total * mult })),
    };
  }, [dateRange]);

  const deptTotals = useMemo(() => {
    const staff = data.departments.reduce((a, b) => a + b.employees, 0);
    const hours = data.departments.reduce((a, b) => a + b.hours, 0);
    const wages = data.departments.reduce((a, b) => a + b.wages, 0);
    return { staff, hours, wages };
  }, [data.departments]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Labor Cost
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Staff expense tracking
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Labor Cost Report',
              pathTemplate: '/reports/labor-cost',
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
            <Text style={styles.metricLabel}>Total Labor Cost</Text>
            <Text style={styles.metricValue}>{money(data.totalLaborCost)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Labor Cost %</Text>
            <Text style={styles.metricValue}>{data.laborPercent.toFixed(0)}%</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Total Hours</Text>
            <Text style={styles.metricValue}>{Math.round(data.totalHours).toLocaleString()}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Sales/Labor Hour</Text>
            <Text style={styles.metricValue}>{`$${data.salesPerLaborHour.toFixed(2)}`}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Labor by department</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {data.departments.map((d) => (
              <View key={d.name} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{d.name}</Text>
                  <Text style={styles.rowSub}>
                    Staff {d.employees} • Hours {Math.round(d.hours)}
                  </Text>
                </View>
                <Text style={styles.rowVal}>{money(d.wages)}</Text>
              </View>
            ))}
            <View style={[styles.row, styles.rowTotal]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { fontWeight: '900' }]}>Total</Text>
                <Text style={styles.rowSub}>
                  Staff {deptTotals.staff} • Hours {Math.round(deptTotals.hours)}
                </Text>
              </View>
              <Text style={[styles.rowVal, { fontWeight: '900', color: '#60a5fa' }]}>{money(deptTotals.wages)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Labor by role</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {data.byRole.map((r) => (
              <View key={r.role} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{r.role}</Text>
                  <Text style={styles.rowSub}>
                    {r.count} staff • ${r.avgWage}/hr
                  </Text>
                </View>
                <Text style={styles.rowVal}>{money(r.total)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Overtime summary</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <View style={styles.smallMetric}>
                <Text style={[styles.smallVal, { color: '#fbbf24' }]}>{Math.round(data.overtime.hours)}</Text>
                <Text style={styles.smallLabel}>OT Hours</Text>
              </View>
              <View style={styles.smallMetric}>
                <Text style={[styles.smallVal, { color: '#f87171' }]}>{money(data.overtime.cost)}</Text>
                <Text style={styles.smallLabel}>OT Cost</Text>
              </View>
              <View style={styles.smallMetric}>
                <Text style={styles.smallVal}>{data.overtime.employees}</Text>
                <Text style={styles.smallLabel}>Employees</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Productivity</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <View style={styles.smallMetric}>
                <Text style={[styles.smallVal, { color: '#34d399' }]}>{`$${data.salesPerLaborHour.toFixed(2)}`}</Text>
                <Text style={styles.smallLabel}>Sales/Labor Hr</Text>
              </View>
              <View style={styles.smallMetric}>
                <Text style={[styles.smallVal, { color: '#60a5fa' }]}>{`$${data.costPerCover.toFixed(2)}`}</Text>
                <Text style={styles.smallLabel}>Cost/Cover</Text>
              </View>
            </View>
            <View style={[styles.highlight, { marginTop: 10 }]}>
              <Text style={styles.smallLabel}>Total covers served</Text>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{Math.round(data.covers).toLocaleString()}</Text>
            </View>
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
  smallMetric: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
  },
  smallVal: { color: '#fff', fontWeight: '900', fontSize: 16 },
  smallLabel: { color: '#9aa4b2', marginTop: 4, fontSize: 12, fontWeight: '800' },
  highlight: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.40)',
    backgroundColor: 'rgba(59,130,246,0.12)',
    alignItems: 'center',
    gap: 4,
  },
});

