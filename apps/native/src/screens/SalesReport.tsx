import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type SalesData = {
  item: string;
  category: string;
  unitsSold: number;
  revenue: number;
  cost: number;
  profit: number;
};

export default function SalesReportScreen({ navigation }: { navigation: Nav }) {
  const [reportData, setReportData] = useState<SalesData[]>([]);
  const [item, setItem] = useState('');
  const [category, setCategory] = useState('');
  const [unitsSold, setUnitsSold] = useState('');
  const [revenue, setRevenue] = useState('');
  const [cost, setCost] = useState('');

  const totals = useMemo(() => {
    const totalRevenue = reportData.reduce((sum, r) => sum + r.revenue, 0);
    const totalCost = reportData.reduce((sum, r) => sum + r.cost, 0);
    const totalProfit = reportData.reduce((sum, r) => sum + r.profit, 0);
    const totalUnits = reportData.reduce((sum, r) => sum + r.unitsSold, 0);
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    return { totalRevenue, totalCost, totalProfit, totalUnits, profitMargin };
  }, [reportData]);

  function handleAddItem() {
    const nItem = item.trim();
    const nCat = category.trim();
    if (!nItem || !nCat || !unitsSold.trim() || !revenue.trim() || !cost.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    const units = Number.parseFloat(unitsSold);
    const rev = Number.parseFloat(revenue);
    const cst = Number.parseFloat(cost);
    if (!Number.isFinite(units) || !Number.isFinite(rev) || !Number.isFinite(cst)) {
      Alert.alert('Invalid numbers', 'Units, revenue, and cost must be valid numbers.');
      return;
    }
    const profit = rev - cst;
    setReportData([
      ...reportData,
      {
        item: nItem,
        category: nCat,
        unitsSold: units,
        revenue: rev,
        cost: cst,
        profit,
      },
    ]);
    setItem('');
    setCategory('');
    setUnitsSold('');
    setRevenue('');
    setCost('');
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Sales Report
          </Text>
          <Text style={styles.sub} numberOfLines={2}>
            Comprehensive sales performance analysis.
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Sales Report',
              pathTemplate: '/sales-report',
            })
          }
        >
          <Text style={styles.btnText}>Open web PDF</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Add Sales Data</Text>
          <Text style={styles.muted}>Enter item sales information.</Text>

          <View style={{ height: 12 }} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Item Name</Text>
              <TextInput value={item} onChangeText={setItem} placeholder="e.g., Mojito" placeholderTextColor="#6b7280" style={styles.input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Category</Text>
              <TextInput value={category} onChangeText={setCategory} placeholder="e.g., Cocktails" placeholderTextColor="#6b7280" style={styles.input} />
            </View>
          </View>

          <View style={{ height: 12 }} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Units Sold</Text>
              <TextInput value={unitsSold} onChangeText={setUnitsSold} keyboardType="decimal-pad" placeholder="150" placeholderTextColor="#6b7280" style={styles.input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Revenue ($)</Text>
              <TextInput value={revenue} onChangeText={setRevenue} keyboardType="decimal-pad" placeholder="1500.00" placeholderTextColor="#6b7280" style={styles.input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Cost ($)</Text>
              <TextInput value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="375.00" placeholderTextColor="#6b7280" style={styles.input} />
            </View>
          </View>

          <View style={{ height: 12 }} />

          <Pressable onPress={handleAddItem} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Add Item</Text>
          </Pressable>
        </View>

        {reportData.length > 0 ? (
          <>
            <View style={{ height: 12 }} />

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Report Summary</Text>
              <View style={{ height: 10 }} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.kpi, { flex: 1, backgroundColor: 'rgba(251,191,36,0.10)', borderColor: 'rgba(251,191,36,0.25)' }]}>
                  <Text style={styles.kpiLabel}>Total Revenue</Text>
                  <Text style={styles.kpiValue}>${totals.totalRevenue.toFixed(2)}</Text>
                </View>
                <View style={[styles.kpi, { flex: 1, backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.20)' }]}>
                  <Text style={styles.kpiLabel}>Total Profit</Text>
                  <Text style={[styles.kpiValue, { color: '#22c55e' }]}>${totals.totalProfit.toFixed(2)}</Text>
                </View>
              </View>
              <View style={{ height: 10 }} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.kpiSmall, { flex: 1 }]}>
                  <Text style={styles.kpiSmallLabel}>Total Cost</Text>
                  <Text style={styles.kpiSmallValue}>${totals.totalCost.toFixed(2)}</Text>
                </View>
                <View style={[styles.kpiSmall, { flex: 1 }]}>
                  <Text style={styles.kpiSmallLabel}>Units Sold</Text>
                  <Text style={styles.kpiSmallValue}>{totals.totalUnits}</Text>
                </View>
                <View style={[styles.kpiSmall, { flex: 1 }]}>
                  <Text style={styles.kpiSmallLabel}>Profit Margin</Text>
                  <Text style={styles.kpiSmallValue}>{totals.profitMargin.toFixed(1)}%</Text>
                </View>
              </View>
            </View>

            <View style={{ height: 12 }} />

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Sales Data</Text>
              <View style={{ height: 10 }} />
              <View style={{ gap: 10 }}>
                {reportData.map((d, idx) => (
                  <View key={`${d.item}-${idx}`} style={styles.rowCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {d.item}
                        </Text>
                        <Text style={styles.rowSub} numberOfLines={1}>
                          {d.category}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.rowProfit}>${d.profit.toFixed(2)}</Text>
                        <Text style={styles.rowUnits}>{d.unitsSold} units</Text>
                      </View>
                    </View>
                    <View style={{ height: 10 }} />
                    <View style={styles.miniGrid}>
                      <MiniStat label="Revenue" value={`$${d.revenue.toFixed(2)}`} />
                      <MiniStat label="Cost" value={`$${d.cost.toFixed(2)}`} />
                      <MiniStat label="Profit" value={`$${d.profit.toFixed(2)}`} accent />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={[styles.miniValue, accent ? { color: '#22c55e' } : null]}>{value}</Text>
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
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  secondaryBtn: {},
  btnText: { color: '#e6e6e6', fontWeight: '800', fontSize: 12 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  sectionTitle: { color: '#fff', fontWeight: '900', fontSize: 15 },
  muted: { color: '#9aa4b2', marginTop: 6, fontSize: 12, lineHeight: 18 },
  label: { color: '#e6e6e6', fontWeight: '800', fontSize: 12, marginBottom: 6 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  primaryBtn: {
    backgroundColor: '#fbbf24',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#000', fontWeight: '900' },
  kpi: { borderRadius: 14, padding: 12, borderWidth: 1 },
  kpiLabel: { color: '#9aa4b2', fontSize: 12, fontWeight: '800' },
  kpiValue: { color: '#fbbf24', fontSize: 20, fontWeight: '900', marginTop: 6 },
  kpiSmall: {
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  kpiSmallLabel: { color: '#9aa4b2', fontSize: 11, fontWeight: '800' },
  kpiSmallValue: { color: '#e6e6e6', fontSize: 14, fontWeight: '900', marginTop: 4 },
  rowCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  rowTitle: { color: '#fff', fontWeight: '900', fontSize: 14 },
  rowSub: { color: '#9aa4b2', marginTop: 2, fontSize: 12 },
  rowProfit: { color: '#22c55e', fontWeight: '900' },
  rowUnits: { color: '#9aa4b2', fontSize: 11, marginTop: 2, fontWeight: '800' },
  miniGrid: { flexDirection: 'row', gap: 8 },
  miniStat: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 10,
  },
  miniLabel: { color: '#9aa4b2', fontSize: 11, fontWeight: '800' },
  miniValue: { color: '#e6e6e6', fontSize: 12, fontWeight: '900', marginTop: 4 },
});

