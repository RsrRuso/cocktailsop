import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Nav = { goBack: () => void; navigate: (name: string, params?: any) => void };

type DateRange = 'month' | 'quarter' | 'year';

function money(n: number) {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString()}`;
}

export default function CashFlowReportScreen({ navigation }: { navigation: Nav }) {
  const [dateRange, setDateRange] = useState<DateRange>('month');

  // Web version is mock data; we mirror it here.
  const data = useMemo(() => {
    const mult = dateRange === 'month' ? 1 : dateRange === 'quarter' ? 3 : 12;
    const base = {
      beginningCash: 25000,
      endingCash: 32500,
      netCashFlow: 7500,
      operating: {
        inflows: [
          { item: 'Customer Receipts', amount: 85000 },
          { item: 'Other Operating Income', amount: 2500 },
        ],
        outflows: [
          { item: 'Supplier Payments', amount: -28000 },
          { item: 'Payroll', amount: -24000 },
          { item: 'Rent', amount: -8000 },
          { item: 'Utilities', amount: -2500 },
          { item: 'Other Operating Expenses', amount: -5500 },
        ],
      },
      investing: {
        inflows: [{ item: 'Equipment Sale', amount: 2000 }],
        outflows: [
          { item: 'Equipment Purchase', amount: -8000 },
          { item: 'Renovation', amount: -5000 },
        ],
      },
      financing: {
        inflows: [{ item: 'Owner Investment', amount: 5000 }],
        outflows: [
          { item: 'Loan Repayment', amount: -4000 },
          { item: 'Owner Withdrawals', amount: -2000 },
        ],
      },
    };

    const scaleLines = (arr: { item: string; amount: number }[]) => arr.map((x) => ({ ...x, amount: x.amount * mult }));
    const operating = { inflows: scaleLines(base.operating.inflows), outflows: scaleLines(base.operating.outflows) };
    const investing = { inflows: scaleLines(base.investing.inflows), outflows: scaleLines(base.investing.outflows) };
    const financing = { inflows: scaleLines(base.financing.inflows), outflows: scaleLines(base.financing.outflows) };

    const sum = (arr: { amount: number }[]) => arr.reduce((a, b) => a + b.amount, 0);
    const operatingNet = sum(operating.inflows) + sum(operating.outflows);
    const investingNet = sum(investing.inflows) + sum(investing.outflows);
    const financingNet = sum(financing.inflows) + sum(financing.outflows);
    const netCashFlow = operatingNet + investingNet + financingNet;
    const beginningCash = base.beginningCash * mult;
    const endingCash = beginningCash + netCashFlow;

    return {
      beginningCash,
      endingCash,
      netCashFlow,
      operating: { ...operating, net: operatingNet },
      investing: { ...investing, net: investingNet },
      financing: { ...financing, net: financingNet },
    };
  }, [dateRange]);

  const inflowsTotal = useMemo(
    () =>
      data.operating.inflows.reduce((a, b) => a + b.amount, 0) +
      data.investing.inflows.reduce((a, b) => a + b.amount, 0) +
      data.financing.inflows.reduce((a, b) => a + b.amount, 0),
    [data],
  );
  const outflowsTotal = useMemo(
    () =>
      Math.abs(
        data.operating.outflows.reduce((a, b) => a + b.amount, 0) +
          data.investing.outflows.reduce((a, b) => a + b.amount, 0) +
          data.financing.outflows.reduce((a, b) => a + b.amount, 0),
      ),
    [data],
  );

  const Section = ({ title, lines, net }: { title: string; lines: { item: string; amount: number }[]; net: number }) => (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ gap: 8, marginTop: 10 }}>
        {lines.map((l) => (
          <View key={l.item} style={styles.line}>
            <Text style={styles.lineLabel}>{l.item}</Text>
            <Text style={[styles.lineValue, { color: l.amount < 0 ? '#fca5a5' : '#9ae6b4' }]}>{money(l.amount)}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.line, styles.lineTotal]}>
        <Text style={[styles.lineLabel, { fontWeight: '900' }]}>{title} net</Text>
        <Text style={[styles.lineValue, { fontWeight: '900', color: net >= 0 ? '#34d399' : '#f87171' }]}>{money(net)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Cash Flow
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Money in/out tracking
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Cash Flow Statement',
              pathTemplate: '/reports/cash-flow',
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
            <Text style={styles.metricLabel}>Beginning Cash</Text>
            <Text style={styles.metricValue}>{money(data.beginningCash)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Cash Inflows</Text>
            <Text style={styles.metricValue}>{money(inflowsTotal)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Cash Outflows</Text>
            <Text style={styles.metricValue}>{money(outflowsTotal)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Ending Cash</Text>
            <Text style={styles.metricValue}>{money(data.endingCash)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={{ marginTop: 10, gap: 8 }}>
            {[
              ['Beginning cash', data.beginningCash],
              ['Net cash flow', data.netCashFlow],
              ['Ending cash', data.endingCash],
            ].map(([label, val]) => (
              <View key={label} style={styles.line}>
                <Text style={styles.lineLabel}>{label}</Text>
                <Text style={[styles.lineValue, { fontWeight: '900' }]}>{money(val as number)}</Text>
              </View>
            ))}
          </View>
        </View>

        <Section title="Operating activities" lines={[...data.operating.inflows, ...data.operating.outflows]} net={data.operating.net} />
        <Section title="Investing activities" lines={[...data.investing.inflows, ...data.investing.outflows]} net={data.investing.net} />
        <Section title="Financing activities" lines={[...data.financing.inflows, ...data.financing.outflows]} net={data.financing.net} />
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
  lineLabel: { color: '#fff', flex: 1, paddingRight: 10, textTransform: 'capitalize' },
  lineValue: { color: '#fff', fontWeight: '800' },
});

