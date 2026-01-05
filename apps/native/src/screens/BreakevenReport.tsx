import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type Nav = { goBack: () => void; navigate: (name: string, params?: any) => void };
type DateRange = 'month' | 'quarter' | 'year';

function money(n: number) {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString()}`;
}

export default function BreakevenReportScreen({ navigation }: { navigation: Nav }) {
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [fixedCosts, setFixedCosts] = useState('25000');
  const [avgSalePrice, setAvgSalePrice] = useState('35');
  const [avgVariableCost, setAvgVariableCost] = useState('12');

  const computed = useMemo(() => {
    const fc = Number(fixedCosts) || 0;
    const sp = Number(avgSalePrice) || 0;
    const vc = Number(avgVariableCost) || 0;
    const contributionMargin = sp - vc;
    const contributionMarginRatio = sp > 0 ? (contributionMargin / sp) * 100 : 0;
    const breakevenUnits = contributionMargin > 0 ? Math.ceil(fc / contributionMargin) : 0;
    const breakevenRevenue = breakevenUnits * sp;

    const currentSales = 1200; // mirrors web mock
    const currentRevenue = currentSales * sp;
    const marginOfSafety = currentSales > 0 ? ((currentSales - breakevenUnits) / currentSales) * 100 : 0;
    const profitAtCurrent = currentSales * contributionMargin - fc;

    return {
      fc,
      sp,
      vc,
      contributionMargin,
      contributionMarginRatio,
      breakevenUnits,
      breakevenRevenue,
      currentSales,
      currentRevenue,
      marginOfSafety,
      profitAtCurrent,
      aboveBreakeven: currentSales - breakevenUnits,
    };
  }, [fixedCosts, avgSalePrice, avgVariableCost]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Breakeven Analysis
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Calculate your breakeven point
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Breakeven Analysis',
              pathTemplate: '/reports/breakeven',
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
            {(['month', 'quarter', 'year'] as const).map((r) => (
              <Pressable key={r} style={[styles.pill, dateRange === r ? styles.pillOn : null]} onPress={() => setDateRange(r)}>
                <Text style={styles.pillText}>{r.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.muted}>This tool is input-driven (like the web report). Date filter doesn’t change calculations yet.</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Breakeven Units</Text>
            <Text style={styles.metricValue}>{computed.breakevenUnits.toLocaleString()}</Text>
            <Text style={styles.metricSub}>units to break even</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Breakeven Revenue</Text>
            <Text style={[styles.metricValue, { color: '#34d399' }]}>{money(computed.breakevenRevenue)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Contribution Margin</Text>
            <Text style={styles.metricValue}>{computed.contributionMarginRatio.toFixed(1)}%</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Margin of Safety</Text>
            <Text style={styles.metricValue}>{computed.marginOfSafety.toFixed(1)}%</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Input variables</Text>
          <Text style={styles.muted}>Update values to recompute breakeven metrics.</Text>

          <View style={{ gap: 10, marginTop: 10 }}>
            <View>
              <Text style={styles.label}>Fixed costs (monthly)</Text>
              <TextInput value={fixedCosts} onChangeText={setFixedCosts} keyboardType="decimal-pad" style={styles.input} />
              <Text style={styles.help}>Rent, salaries, insurance, etc.</Text>
            </View>
            <View>
              <Text style={styles.label}>Average sale price</Text>
              <TextInput value={avgSalePrice} onChangeText={setAvgSalePrice} keyboardType="decimal-pad" style={styles.input} />
              <Text style={styles.help}>Average price per transaction</Text>
            </View>
            <View>
              <Text style={styles.label}>Average variable cost</Text>
              <TextInput value={avgVariableCost} onChangeText={setAvgVariableCost} keyboardType="decimal-pad" style={styles.input} />
              <Text style={styles.help}>COGS per unit sold</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Breakeven calculation</Text>

          <View style={styles.calcBox}>
            <View style={styles.calcLine}>
              <Text style={styles.calcLabel}>Average sale price</Text>
              <Text style={styles.calcValue}>{money(computed.sp)}</Text>
            </View>
            <View style={styles.calcLine}>
              <Text style={styles.calcLabel}>− Variable cost</Text>
              <Text style={[styles.calcValue, { color: '#f87171' }]}>{money(computed.vc)}</Text>
            </View>
            <View style={[styles.calcLine, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)', paddingTop: 8 }]}>
              <Text style={[styles.calcLabel, { fontWeight: '900' }]}>= Contribution margin</Text>
              <Text style={[styles.calcValue, { fontWeight: '900', color: '#34d399' }]}>{money(computed.contributionMargin)}</Text>
            </View>
          </View>

          <View style={styles.highlight}>
            <Text style={styles.help}>Breakeven formula</Text>
            <Text style={styles.mono}>BE Units = Fixed Costs ÷ Contribution Margin</Text>
            <Text style={styles.mono}>
              {computed.breakevenUnits.toLocaleString()} = {money(computed.fc)} ÷ {money(computed.contributionMargin)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={[styles.smallMetric, { flex: 1 }]}>
              <Text style={[styles.smallVal, { color: '#60a5fa' }]}>{computed.breakevenUnits.toLocaleString()}</Text>
              <Text style={styles.smallLabel}>Units to breakeven</Text>
            </View>
            <View style={[styles.smallMetric, { flex: 1 }]}>
              <Text style={[styles.smallVal, { color: '#34d399' }]}>{money(computed.breakevenRevenue)}</Text>
              <Text style={styles.smallLabel}>Revenue to breakeven</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Current performance vs breakeven</Text>
          <Text style={styles.muted}>Current sales are mocked (matches web report).</Text>

          <View style={styles.grid}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Current Sales</Text>
              <Text style={styles.metricValue}>{`${computed.currentSales.toLocaleString()} units`}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Current Revenue</Text>
              <Text style={styles.metricValue}>{money(computed.currentRevenue)}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Profit / Loss</Text>
              <Text style={[styles.metricValue, { color: computed.profitAtCurrent >= 0 ? '#34d399' : '#f87171' }]}>{money(computed.profitAtCurrent)}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Above Breakeven</Text>
              <Text style={[styles.metricValue, { color: '#60a5fa' }]}>
                {computed.aboveBreakeven >= 0 ? '+' : ''}
                {computed.aboveBreakeven.toLocaleString()} units
              </Text>
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
    gap: 8,
  },
  sectionTitle: { color: '#fff', fontWeight: '900' },
  muted: { color: '#9aa4b2', marginTop: 0, fontSize: 12, lineHeight: 18 },
  label: { color: '#9aa4b2', fontSize: 12, fontWeight: '900' },
  help: { color: '#9aa4b2', marginTop: 4, fontSize: 12 },
  mono: { color: '#9aa4b2', marginTop: 6, fontSize: 12, fontFamily: 'monospace' as any },
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
  calcBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 12,
    gap: 8,
  },
  calcLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calcLabel: { color: '#fff' },
  calcValue: { color: '#fff', fontWeight: '800' },
  highlight: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.40)',
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  smallMetric: {
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
});

