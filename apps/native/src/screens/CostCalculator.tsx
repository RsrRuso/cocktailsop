import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };
type Ingredient = { id: string; name: string; amount: string; unit: string; costPerUnit: string };

const UNITS = ['ml', 'oz', 'g', 'unit'] as const;

export default function CostCalculatorScreen({ navigation }: { navigation: Nav }) {
  const [recipeName, setRecipeName] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ id: '1', name: '', amount: '', unit: 'ml', costPerUnit: '' }]);
  const [targetMargin, setTargetMargin] = useState('65');

  const result = useMemo(() => {
    const valid = ingredients.filter((i) => i.amount.trim() && i.costPerUnit.trim());
    if (valid.length === 0) return null;
    const totalCost = valid.reduce((sum, i) => sum + Number.parseFloat(i.amount) * Number.parseFloat(i.costPerUnit), 0);
    if (!Number.isFinite(totalCost)) return null;
    const margin = Number.parseFloat(targetMargin || '0') / 100;
    const suggestedPrice = margin >= 1 ? Number.POSITIVE_INFINITY : totalCost / (1 - margin);
    const profit = suggestedPrice - totalCost;
    const actualMargin = suggestedPrice > 0 ? (profit / suggestedPrice) * 100 : 0;
    return { totalCost, suggestedPrice, profit, actualMargin };
  }, [ingredients, targetMargin]);

  function addIngredient() {
    setIngredients([...ingredients, { id: `${Date.now()}`, name: '', amount: '', unit: 'ml', costPerUnit: '' }]);
  }
  function removeIngredient(id: string) {
    if (ingredients.length <= 1) return;
    setIngredients(ingredients.filter((i) => i.id !== id));
  }
  function updateIngredient(id: string, field: keyof Ingredient, value: string) {
    setIngredients(ingredients.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Cost Calculator
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Calculate recipe costs and pricing
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Cost calculator',
              pathTemplate: '/cost-calculator',
            })
          }
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recipe/Cocktail Name</Text>
          <View style={{ height: 8 }} />
          <TextInput value={recipeName} onChangeText={setRecipeName} placeholder="e.g., Espresso Martini" placeholderTextColor="#6b7280" style={styles.input} />

          <View style={{ height: 12 }} />
          <Text style={styles.sectionTitle}>Target Profit Margin (%)</Text>
          <View style={{ height: 8 }} />
          <TextInput value={targetMargin} onChangeText={setTargetMargin} keyboardType="decimal-pad" placeholder="65" placeholderTextColor="#6b7280" style={styles.input} />

          <View style={{ height: 12 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.sectionTitle}>Ingredients with Costs</Text>
            <Pressable onPress={addIngredient} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>+ Add</Text>
            </Pressable>
          </View>

          <View style={{ height: 10 }} />
          <View style={{ gap: 10 }}>
            {ingredients.map((ing) => (
              <View key={ing.id} style={styles.ingCard}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput value={ing.name} onChangeText={(v) => updateIngredient(ing.id, 'name', v)} placeholder="Ingredient name" placeholderTextColor="#6b7280" style={[styles.input, { flex: 1, marginBottom: 0 }]} />
                  <Pressable
                    onPress={() => {
                      if (ingredients.length === 1) {
                        Alert.alert('Cannot remove', 'At least one ingredient is required.');
                        return;
                      }
                      removeIngredient(ing.id);
                    }}
                    style={[styles.iconBtn, ingredients.length === 1 ? { opacity: 0.5 } : null]}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </Pressable>
                </View>

                <View style={{ height: 8 }} />
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput value={ing.amount} onChangeText={(v) => updateIngredient(ing.id, 'amount', v)} keyboardType="decimal-pad" placeholder="Amount" placeholderTextColor="#6b7280" style={[styles.input, { width: 90, marginBottom: 0 }]} />
                  <Pressable
                    onPress={() => {
                      const i = UNITS.indexOf(ing.unit as any);
                      const next = UNITS[(i + 1) % UNITS.length];
                      updateIngredient(ing.id, 'unit', next);
                    }}
                    style={styles.unitBtn}
                  >
                    <Text style={styles.unitText}>{ing.unit}</Text>
                  </Pressable>
                  <TextInput value={ing.costPerUnit} onChangeText={(v) => updateIngredient(ing.id, 'costPerUnit', v)} keyboardType="decimal-pad" placeholder="Cost per unit" placeholderTextColor="#6b7280" style={[styles.input, { flex: 1, marginBottom: 0 }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {result && recipeName.trim() ? (
          <>
            <View style={{ height: 12 }} />
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Cost Analysis</Text>
              <View style={{ height: 10 }} />
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>Total Cost</Text>
                <Text style={styles.kvVal}>${result.totalCost.toFixed(2)}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>Suggested Price</Text>
                <Text style={{ color: '#fbbf24', fontWeight: '900' }}>
                  ${Number.isFinite(result.suggestedPrice) ? result.suggestedPrice.toFixed(2) : '∞'}
                </Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>Profit per Serve</Text>
                <Text style={{ color: '#22c55e', fontWeight: '900' }}>${Number.isFinite(result.profit) ? result.profit.toFixed(2) : '∞'}</Text>
              </View>
              <View style={[styles.kvRow, { paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)', marginTop: 6 }]}>
                <Text style={[styles.kvVal, { fontSize: 16, fontWeight: '900' }]}>Profit Margin</Text>
                <Text style={{ color: '#fbbf24', fontSize: 28, fontWeight: '900' }}>{result.actualMargin.toFixed(2)}%</Text>
              </View>
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
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  ingCard: {
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.18)',
  },
  unitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  unitText: { color: '#e6e6e6', fontWeight: '900', fontSize: 12 },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  smallBtnText: { color: '#e6e6e6', fontWeight: '900', fontSize: 12 },
  kvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  kvKey: { color: '#9aa4b2', fontSize: 12 },
  kvVal: { color: '#e6e6e6', fontSize: 12, fontWeight: '800' },
});

