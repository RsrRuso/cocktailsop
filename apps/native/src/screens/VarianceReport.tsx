import React, { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type Nav = { goBack: () => void; navigate: (name: string, params?: any) => void };

type VarianceRow = {
  item: string;
  qty: number; // expected
  qtyInSystem: number;
  physicalQty: number;
  finalQty: number;
  itemId: string;
};

export default function VarianceReportScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const reportQ = useQuery({
    queryKey: ['reports', 'variance', userId],
    enabled: !!userId,
    queryFn: async (): Promise<VarianceRow[]> => {
      const { data: varianceReports, error } = await supabase
        .from('variance_reports')
        .select('id, report_date, report_data')
        .eq('user_id', userId)
        .order('report_date', { ascending: false })
        .limit(1);
      if (error) throw error;
      if (!varianceReports || varianceReports.length === 0) return [];
      const latest = varianceReports[0] as any;
      const reportItems = (latest.report_data as any[]) || [];
      const rows: VarianceRow[] = reportItems.map((item: any) => {
        const expected = Number(item.expected_quantity) || 0;
        const physical = Number(item.actual_quantity) || 0;
        const finalQty = Number(item.final_quantity ?? physical) || 0;
        const systemQty = finalQty;
        return {
          item: item.item_name || 'Unknown Item',
          qty: expected,
          qtyInSystem: systemQty,
          physicalQty: physical,
          finalQty,
          itemId: item.item_id,
        };
      });
      return rows;
    },
  });

  const variances = reportQ.data ?? [];

  const summary = useMemo(() => {
    const totalVariance = variances.reduce((sum, item) => sum + Math.abs(item.physicalQty - item.qtyInSystem), 0);
    const overages = variances.filter((v) => v.physicalQty > v.qtyInSystem).length;
    const shortages = variances.filter((v) => v.physicalQty < v.qtyInSystem).length;
    return { totalVariance, overages, shortages };
  }, [variances]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Variance Report
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Spot checks & variance
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Variance Report',
              pathTemplate: '/variance-report',
            })
          }
        >
          <Text style={styles.btnText}>Open web PDF</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 12 }}>
        {reportQ.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
        {reportQ.isError ? <Text style={styles.muted}>Failed to load variance report.</Text> : null}

        {variances.length === 0 && !reportQ.isLoading ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>No variance data</Text>
            <Text style={styles.muted}>Complete spot checks to generate variance reports.</Text>
          </View>
        ) : null}

        {variances.length > 0 ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <View style={styles.bigTotal}>
                <Text style={styles.bigTotalLabel}>Total variance</Text>
                <Text style={styles.bigTotalValue}>{summary.totalVariance.toFixed(2)}</Text>
                <Text style={styles.bigTotalLabel}>
                  Over: {summary.overages} • Under: {summary.shortages} • Items: {variances.length}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Variance details</Text>
              <View style={{ gap: 8, marginTop: 10 }}>
                {variances.map((v, idx) => {
                  const delta = v.physicalQty - v.qtyInSystem;
                  const deltaColor = delta > 0 ? '#34d399' : delta < 0 ? '#f87171' : '#9aa4b2';
                  return (
                    <View key={`${v.itemId}-${idx}`} style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {v.item}
                        </Text>
                        <Text style={styles.rowSub}>
                          Expected {v.qty.toFixed(2)} • System {v.qtyInSystem.toFixed(2)} • Physical {v.physicalQty.toFixed(2)} • Final{' '}
                          {v.finalQty.toFixed(2)}
                        </Text>
                      </View>
                      <Text style={[styles.rowVal, { color: deltaColor }]}>
                        {delta > 0 ? '+' : ''}
                        {delta.toFixed(2)}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <Pressable
                style={[styles.btn, styles.secondaryBtn, { marginTop: 12 }]}
                onPress={() => Alert.alert('PDF export', 'Use “Open web PDF” for now; native export will be added later.')}
              >
                <Text style={styles.btnText}>Export (coming soon)</Text>
              </Pressable>
            </View>
          </>
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
  muted: { color: '#9aa4b2', marginTop: 8, fontSize: 12, lineHeight: 18 },
  btn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  bigTotal: {
    marginTop: 10,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.35)',
    backgroundColor: 'rgba(96,165,250,0.12)',
    alignItems: 'center',
    gap: 6,
  },
  bigTotalLabel: { color: '#9aa4b2', fontWeight: '800', fontSize: 12 },
  bigTotalValue: { color: '#60a5fa', fontWeight: '900', fontSize: 28 },
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
});

