import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type Nav = { goBack: () => void; navigate: (name: string, params?: any) => void };

type DrinkAnalysis = {
  id: string;
  name: string;
  sellingPrice: number;
  costOfGoods: number;
  pourCost: number;
  status: 'good' | 'warning' | 'poor';
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function toNum(v: string) {
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : NaN;
}

export default function PourCostAnalysisScreen({ navigation }: { navigation: Nav }) {
  const [drinks, setDrinks] = useState<DrinkAnalysis[]>([]);
  const [drinkName, setDrinkName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costOfGoods, setCostOfGoods] = useState('');

  function calculatePourCost(cost: number, price: number) {
    return (cost / price) * 100;
  }

  function getStatus(pourCost: number): DrinkAnalysis['status'] {
    if (pourCost <= 20) return 'good';
    if (pourCost <= 30) return 'warning';
    return 'poor';
  }

  function addDrink() {
    if (!drinkName.trim() || !sellingPrice.trim() || !costOfGoods.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    const price = toNum(sellingPrice);
    const cost = toNum(costOfGoods);
    if (!Number.isFinite(price) || !Number.isFinite(cost) || price <= 0 || cost < 0) {
      Alert.alert('Invalid values', 'Selling price must be > 0 and cost must be ≥ 0.');
      return;
    }
    if (cost > price) {
      Alert.alert('Invalid values', 'Cost cannot be greater than selling price.');
      return;
    }

    const pourCost = calculatePourCost(cost, price);
    const status = getStatus(pourCost);

    setDrinks((arr) => [
      ...arr,
      {
        id: uid(),
        name: drinkName.trim(),
        sellingPrice: price,
        costOfGoods: cost,
        pourCost,
        status,
      },
    ]);
    setDrinkName('');
    setSellingPrice('');
    setCostOfGoods('');
  }

  const averagePourCost = useMemo(() => {
    if (drinks.length === 0) return 0;
    return drinks.reduce((sum, d) => sum + d.pourCost, 0) / drinks.length;
  }, [drinks]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Pour Cost Analysis
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Monitor profitability and control costs
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Pour Cost Analysis',
              pathTemplate: '/pour-cost-analysis',
            })
          }
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 12 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Add drink for analysis</Text>
          <Text style={styles.muted}>Enter drink details to calculate pour cost percentage.</Text>

          <Text style={styles.label}>Drink name</Text>
          <TextInput value={drinkName} onChangeText={setDrinkName} placeholder="e.g., Margarita" placeholderTextColor="#6b7280" style={styles.input} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Selling price ($)</Text>
              <TextInput value={sellingPrice} onChangeText={setSellingPrice} keyboardType="decimal-pad" placeholder="12.00" placeholderTextColor="#6b7280" style={styles.input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Cost of goods ($)</Text>
              <TextInput value={costOfGoods} onChangeText={setCostOfGoods} keyboardType="decimal-pad" placeholder="2.50" placeholderTextColor="#6b7280" style={styles.input} />
            </View>
          </View>

          <Pressable style={[styles.btn, styles.primaryBtn, { marginTop: 10 }]} onPress={() => addDrink()}>
            <Text style={styles.btnText}>Add to analysis</Text>
          </Pressable>
        </View>

        {drinks.length > 0 ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Overall metrics</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <Text style={styles.muted}>Average pour cost</Text>
                <Text
                  style={[
                    styles.bigValue,
                    { color: averagePourCost <= 20 ? '#34d399' : averagePourCost <= 30 ? '#fbbf24' : '#f87171' },
                  ]}
                >
                  {averagePourCost.toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.muted}>Industry standard: 18–24% • Target: under 25%</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Drink analysis</Text>
              <View style={{ gap: 10, marginTop: 10 }}>
                {drinks.map((d) => {
                  const statusColor = d.status === 'good' ? '#34d399' : d.status === 'warning' ? '#fbbf24' : '#f87171';
                  const statusLabel = d.status === 'good' ? 'Excellent' : d.status === 'warning' ? 'Review' : 'Action Needed';
                  const profit = d.sellingPrice - d.costOfGoods;
                  const marginPct = (1 - d.pourCost / 100) * 100;
                  return (
                    <View key={d.id} style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {d.name}
                        </Text>
                        <Text style={styles.rowSub} numberOfLines={1}>
                          ${d.sellingPrice.toFixed(2)} • Cost ${d.costOfGoods.toFixed(2)}
                        </Text>

                        <View style={{ marginTop: 10 }}>
                          <View style={styles.barTrack}>
                            <View style={[styles.barFill, { width: `${Math.min(d.pourCost, 100)}%`, backgroundColor: statusColor }]} />
                          </View>
                          <Text style={styles.rowSub}>
                            Profit: ${profit.toFixed(2)} ({marginPct.toFixed(1)}%)
                          </Text>
                        </View>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.pourCost, { color: statusColor }]}>{d.pourCost.toFixed(1)}%</Text>
                        <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              <Pressable
                style={[styles.btn, styles.dangerBtn, { marginTop: 12 }]}
                onPress={() =>
                  Alert.alert('Clear analysis?', 'Remove all drinks from this analysis?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', style: 'destructive', onPress: () => setDrinks([]) },
                  ])
                }
              >
                <Text style={styles.btnText}>Clear</Text>
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
  muted: { color: '#9aa4b2', marginTop: 6, fontSize: 12, lineHeight: 18 },
  label: { color: '#9aa4b2', fontSize: 12, fontWeight: '900', marginTop: 10 },
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
  btn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { backgroundColor: 'rgba(59,130,246,0.35)', borderColor: 'rgba(59,130,246,0.55)' },
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' },
  dangerBtn: { backgroundColor: 'rgba(239,68,68,0.18)', borderColor: 'rgba(239,68,68,0.40)' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  bigValue: { fontSize: 22, fontWeight: '900' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 12,
    borderRadius: 14,
  },
  rowTitle: { color: '#fff', fontWeight: '900' },
  rowSub: { color: '#9aa4b2', marginTop: 2, fontSize: 12 },
  pourCost: { fontSize: 22, fontWeight: '900' },
  barTrack: { height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  badgeText: { marginTop: 6, fontSize: 12, fontWeight: '900' },
});

