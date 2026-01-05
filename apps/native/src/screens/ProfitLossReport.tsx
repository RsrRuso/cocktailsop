import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Nav = { goBack: () => void; navigate: (name: string, params?: any) => void };

type DateRange = 'month' | 'quarter' | 'year';

function money(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

export default function ProfitLossReportScreen({ navigation }: { navigation: Nav }) {
  const [dateRange, setDateRange] = useState<DateRange>('month');

  // Web version is currently mock data, so we mirror it here for parity.
  const data = useMemo(() => {
    const base = {
      revenue: {
        foodSales: 45000,
        beverageSales: 32000,
        otherIncome: 3000,
      },
      cogs: {
        foodCost: 13500,
        beverageCost: 8000,
      },
      operatingExpenses: {
        labor: 24000,
        rent: 8000,
        utilities: 2500,
        marketing: 1500,
        supplies: 1200,
        insurance: 800,
        maintenance: 600,
        other: 1400,
      },
    };

    // Very light scaling by range, since the web report also supports switching ranges.
    const mult = dateRange === 'month' ? 1 : dateRange === 'quarter' ? 3 : 12;
    const revenueTotal = (base.revenue.foodSales + base.revenue.beverageSales + base.revenue.otherIncome) * mult;
    const cogsTotal = (base.cogs.foodCost + base.cogs.beverageCost) * mult;
    const grossProfit = revenueTotal - cogsTotal;
    const grossMargin = revenueTotal > 0 ? (grossProfit / revenueTotal) * 100 : 0;
    const expensesTotal =
      (base.operatingExpenses.labor +
        base.operatingExpenses.rent +
        base.operatingExpenses.utilities +
        base.operatingExpenses.marketing +
        base.operatingExpenses.supplies +
        base.operatingExpenses.insurance +
        base.operatingExpenses.maintenance +
        base.operatingExpenses.other) *
      mult;
    const netProfit = grossProfit - expensesTotal;
    const netMargin = revenueTotal > 0 ? (netProfit / revenueTotal) * 100 : 0;

    return {
      revenue: {
        foodSales: base.revenue.foodSales * mult,
        beverageSales: base.revenue.beverageSales * mult,
        otherIncome: base.revenue.otherIncome * mult,
        total: revenueTotal,
      },
      cogs: {
        foodCost: base.cogs.foodCost * mult,
        beverageCost: base.cogs.beverageCost * mult,
        total: cogsTotal,
      },
      grossProfit,
      grossMargin,
      operatingExpenses: { ...Object.fromEntries(Object.entries(base.operatingExpenses).map(([k, v]) => [k, v * mult])) } as Record<string, number>,
      operatingTotal: expensesTotal,
      netProfit,
      netMargin,
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
            Profit & Loss (P&L)
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Revenue, costs, and net profit
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Profit & Loss (P&L)',
              pathTemplate: '/reports/profit-loss',
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
          <Text style={styles.muted}>
            Note: the current web report uses mock data; native mirrors it until the real finance pipeline is connected.
          </Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Total Revenue</Text>
            <Text style={styles.metricValue}>{money(data.revenue.total)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Gross Profit</Text>
            <Text style={styles.metricValue}>{money(data.grossProfit)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Net Profit</Text>
            <Text style={styles.metricValue}>{money(data.netProfit)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Net Margin</Text>
            <Text style={styles.metricValue}>{data.netMargin.toFixed(1)}%</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Revenue breakdown</Text>
          {[
            ['Food sales', data.revenue.foodSales],
            ['Beverage sales', data.revenue.beverageSales],
            ['Other income', data.revenue.otherIncome],
          ].map(([label, val]) => (
            <View key={label} style={styles.line}>
              <Text style={styles.lineLabel}>{label}</Text>
              <Text style={styles.lineValue}>{money(val as number)}</Text>
            </View>
          ))}
          <View style={[styles.line, styles.lineTotal]}>
            <Text style={[styles.lineLabel, { fontWeight: '900' }]}>Total revenue</Text>
            <Text style={[styles.lineValue, { fontWeight: '900', color: '#34d399' }]}>{money(data.revenue.total)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cost of goods sold (COGS)</Text>
          {[
            ['Food cost', data.cogs.foodCost],
            ['Beverage cost', data.cogs.beverageCost],
          ].map(([label, val]) => (
            <View key={label} style={styles.line}>
              <Text style={styles.lineLabel}>{label}</Text>
              <Text style={[styles.lineValue, { color: '#fca5a5' }]}>{money(val as number)}</Text>
            </View>
          ))}
          <View style={[styles.line, styles.lineTotal]}>
            <Text style={[styles.lineLabel, { fontWeight: '900' }]}>Total COGS</Text>
            <Text style={[styles.lineValue, { fontWeight: '900', color: '#f87171' }]}>{money(data.cogs.total)}</Text>
          </View>
          <View style={[styles.line, styles.lineHighlight]}>
            <Text style={[styles.lineLabel, { fontWeight: '900' }]}>Gross profit</Text>
            <Text style={[styles.lineValue, { fontWeight: '900' }]}>
              {money(data.grossProfit)} ({data.grossMargin.toFixed(1)}%)
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Operating expenses</Text>
          {Object.entries(data.operatingExpenses).map(([k, v]) => (
            <View key={k} style={styles.line}>
              <Text style={styles.lineLabel}>{k}</Text>
              <Text style={[styles.lineValue, { color: '#fca5a5' }]}>{money(v)}</Text>
            </View>
          ))}
          <View style={[styles.line, styles.lineTotal]}>
            <Text style={[styles.lineLabel, { fontWeight: '900' }]}>Total expenses</Text>
            <Text style={[styles.lineValue, { fontWeight: '900', color: '#f87171' }]}>{money(data.operatingTotal)}</Text>
          </View>
          <View style={[styles.line, styles.lineHighlight]}>
            <Text style={[styles.lineLabel, { fontWeight: '900' }]}>Net profit</Text>
            <Text style={[styles.lineValue, { fontWeight: '900', color: data.netProfit >= 0 ? '#34d399' : '#f87171' }]}>
              {money(data.netProfit)} ({data.netMargin.toFixed(1)}%)
            </Text>
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
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  lineTotal: { borderBottomWidth: 0, marginTop: 6, paddingTop: 10 },
  lineHighlight: { borderBottomWidth: 0, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingHorizontal: 10, marginTop: 8 },
  lineLabel: { color: '#fff', textTransform: 'capitalize' },
  lineValue: { color: '#fff', fontWeight: '800' },
});

