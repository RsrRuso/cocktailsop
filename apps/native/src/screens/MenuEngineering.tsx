import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type Nav = { goBack: () => void; navigate: (name: string, params?: any) => void };

type Category = 'star' | 'plow' | 'puzzle' | 'dog';

type MenuItem = {
  id: string;
  name: string;
  profitMargin: number;
  popularity: number;
  category: Category;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function categorizeItem(profit: number, popularity: number, avgProfit: number, avgPopularity: number): Category {
  if (profit >= avgProfit && popularity >= avgPopularity) return 'star';
  if (profit < avgProfit && popularity >= avgPopularity) return 'plow';
  if (profit >= avgProfit && popularity < avgPopularity) return 'puzzle';
  return 'dog';
}

function infoFor(cat: Category) {
  switch (cat) {
    case 'star':
      return {
        title: 'Stars',
        color: '#fbbf24',
        bg: 'rgba(245,158,11,0.12)',
        border: 'rgba(245,158,11,0.35)',
        description: 'High profit, high popularity — keep these!',
        action: 'Maintain quality and promote heavily',
      };
    case 'plow':
      return {
        title: 'Plowhorses',
        color: '#60a5fa',
        bg: 'rgba(59,130,246,0.12)',
        border: 'rgba(59,130,246,0.35)',
        description: 'Low profit, high popularity',
        action: 'Increase prices or reduce costs',
      };
    case 'puzzle':
      return {
        title: 'Puzzles',
        color: '#c084fc',
        bg: 'rgba(168,85,247,0.12)',
        border: 'rgba(168,85,247,0.35)',
        description: 'High profit, low popularity',
        action: 'Reposition, rename, or bundle',
      };
    case 'dog':
      return {
        title: 'Dogs',
        color: '#f87171',
        bg: 'rgba(239,68,68,0.14)',
        border: 'rgba(239,68,68,0.40)',
        description: 'Low profit, low popularity',
        action: 'Consider removing from menu',
      };
  }
}

export default function MenuEngineeringScreen({ navigation }: { navigation: Nav }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [itemName, setItemName] = useState('');
  const [profitMargin, setProfitMargin] = useState('');
  const [unitsSold, setUnitsSold] = useState('');

  const categories = useMemo(() => {
    return {
      star: items.filter((i) => i.category === 'star'),
      plow: items.filter((i) => i.category === 'plow'),
      puzzle: items.filter((i) => i.category === 'puzzle'),
      dog: items.filter((i) => i.category === 'dog'),
    };
  }, [items]);

  function addItem() {
    if (!itemName.trim() || !profitMargin.trim() || !unitsSold.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    const profit = Number(profitMargin);
    const sold = Number(unitsSold);
    if (!Number.isFinite(profit) || !Number.isFinite(sold) || sold < 0) {
      Alert.alert('Invalid values', 'Profit margin and units sold must be valid numbers.');
      return;
    }

    const avgProfit = items.length > 0 ? items.reduce((sum, it) => sum + it.profitMargin, 0) / items.length : profit;
    const avgPopularity = items.length > 0 ? items.reduce((sum, it) => sum + it.popularity, 0) / items.length : sold;

    const newItems: MenuItem[] = [
      ...items,
      {
        id: uid(),
        name: itemName.trim(),
        profitMargin: profit,
        popularity: sold,
        category: categorizeItem(profit, sold, avgProfit, avgPopularity),
      },
    ];

    // Re-categorize with new averages
    const newAvgProfit = newItems.reduce((sum, it) => sum + it.profitMargin, 0) / newItems.length;
    const newAvgPopularity = newItems.reduce((sum, it) => sum + it.popularity, 0) / newItems.length;
    const recat = newItems.map((it) => ({ ...it, category: categorizeItem(it.profitMargin, it.popularity, newAvgProfit, newAvgPopularity) }));

    setItems(recat);
    setItemName('');
    setProfitMargin('');
    setUnitsSold('');
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Menu Engineering
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Optimize menu profitability & performance
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Menu Engineering',
              pathTemplate: '/menu-engineering',
            })
          }
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 12 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Add menu item</Text>
          <Text style={styles.muted}>Analyze profitability and popularity patterns.</Text>

          <Text style={styles.label}>Item name</Text>
          <TextInput value={itemName} onChangeText={setItemName} placeholder="e.g., Classic Mojito" placeholderTextColor="#6b7280" style={styles.input} />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Profit margin ($)</Text>
              <TextInput value={profitMargin} onChangeText={setProfitMargin} keyboardType="decimal-pad" placeholder="8.50" placeholderTextColor="#6b7280" style={styles.input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Units sold (month)</Text>
              <TextInput value={unitsSold} onChangeText={setUnitsSold} keyboardType="decimal-pad" placeholder="150" placeholderTextColor="#6b7280" style={styles.input} />
            </View>
          </View>

          <Pressable style={[styles.btn, styles.primaryBtn, { marginTop: 10 }]} onPress={() => addItem()}>
            <Text style={styles.btnText}>Add item</Text>
          </Pressable>
        </View>

        {items.length > 0 ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Menu matrix overview</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                {(Object.keys(categories) as Category[]).map((k) => {
                  const info = infoFor(k);
                  const count = categories[k].length;
                  return (
                    <View key={k} style={[styles.overviewBox, { backgroundColor: info.bg, borderColor: info.border }]}>
                      <Text style={[styles.overviewTitle, { color: info.color }]}>{info.title}</Text>
                      <Text style={[styles.overviewCount, { color: info.color }]}>{count}</Text>
                      <Text style={styles.muted}>{count === 1 ? 'item' : 'items'}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {(Object.keys(categories) as Category[]).map((k) => {
              const list = categories[k];
              if (list.length === 0) return null;
              const info = infoFor(k);
              return (
                <View key={`section-${k}`} style={styles.card}>
                  <Text style={styles.sectionTitle}>{info.title}</Text>
                  <Text style={styles.muted}>{info.description}</Text>
                  <Text style={[styles.muted, { color: info.color, fontWeight: '900' }]}>{`→ ${info.action}`}</Text>
                  <View style={{ gap: 10, marginTop: 10 }}>
                    {list.map((it) => (
                      <View key={it.id} style={[styles.row, { backgroundColor: info.bg, borderColor: info.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowTitle} numberOfLines={1}>
                            {it.name}
                          </Text>
                          <Text style={styles.rowSub}>
                            Profit: ${it.profitMargin.toFixed(2)} • Units: {it.popularity}
                          </Text>
                          <Text style={[styles.rowSub, { marginTop: 6 }]}>Monthly revenue:</Text>
                          <Text style={[styles.rowVal, { color: info.color }]}>{`$${(it.profitMargin * it.popularity).toFixed(2)}`}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}

            <Pressable
              style={[styles.btn, styles.dangerBtn]}
              onPress={() =>
                Alert.alert('Clear analysis?', 'Remove all items from this menu matrix?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive', onPress: () => setItems([]) },
                ])
              }
            >
              <Text style={styles.btnText}>Clear</Text>
            </Pressable>
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
  overviewBox: {
    width: '48%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  overviewTitle: { fontWeight: '900' },
  overviewCount: { fontWeight: '900', fontSize: 24 },
  row: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
  },
  rowTitle: { color: '#fff', fontWeight: '900' },
  rowSub: { color: '#9aa4b2', marginTop: 2, fontSize: 12 },
  rowVal: { fontWeight: '900', marginTop: 2 },
});

