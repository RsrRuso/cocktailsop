import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };
type Ingredient = { id: string; name: string; amount: string; unit: string };

const UNITS = ['ml', 'oz', 'cl', 'dash', 'tsp'] as const;

export default function ScalingToolScreen({ navigation }: { navigation: Nav }) {
  const [recipeName, setRecipeName] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ id: '1', name: '', amount: '', unit: 'ml' }]);
  const [scaleFactor, setScaleFactor] = useState('2');

  const scaled = useMemo(() => {
    const f = Number.parseFloat(scaleFactor);
    if (!Number.isFinite(f)) return null;
    return ingredients.map((ing) => ({
      ...ing,
      scaledAmount: (Number.parseFloat(ing.amount || '0') * f).toFixed(2),
    }));
  }, [ingredients, scaleFactor]);

  function addIngredient() {
    setIngredients([...ingredients, { id: `${Date.now()}`, name: '', amount: '', unit: 'ml' }]);
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
            Recipe Scaling Tool
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Scale recipes up or down
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Scaling tool',
              pathTemplate: '/scaling-tool',
            })
          }
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recipe Name</Text>
          <View style={{ height: 8 }} />
          <TextInput value={recipeName} onChangeText={setRecipeName} placeholder="e.g., Old Fashioned" placeholderTextColor="#6b7280" style={styles.input} />

          <View style={{ height: 12 }} />
          <Text style={styles.sectionTitle}>Scale Factor</Text>
          <View style={{ height: 8 }} />
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput value={scaleFactor} onChangeText={setScaleFactor} keyboardType="decimal-pad" placeholder="2" placeholderTextColor="#6b7280" style={[styles.input, { flex: 1 }]} />
            <Text style={{ color: '#9aa4b2', fontWeight: '800' }}>× original</Text>
          </View>
          <Text style={styles.muted}>Examples: 0.5 for half, 2 for double, 10 for batch of 10.</Text>

          <View style={{ height: 12 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.sectionTitle}>Original Recipe</Text>
            <Pressable onPress={addIngredient} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>+ Add</Text>
            </Pressable>
          </View>

          <View style={{ height: 10 }} />
          <View style={{ gap: 8 }}>
            {ingredients.map((ing) => (
              <View key={ing.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput value={ing.name} onChangeText={(v) => updateIngredient(ing.id, 'name', v)} placeholder="Ingredient" placeholderTextColor="#6b7280" style={[styles.input, { flex: 1, marginBottom: 0 }]} />
                <TextInput value={ing.amount} onChangeText={(v) => updateIngredient(ing.id, 'amount', v)} placeholder="Amt" placeholderTextColor="#6b7280" keyboardType="decimal-pad" style={[styles.input, { width: 84, marginBottom: 0 }]} />
                <Pressable
                  onPress={() => {
                    // cycle units quickly
                    const i = UNITS.indexOf(ing.unit as any);
                    const next = UNITS[(i + 1) % UNITS.length];
                    updateIngredient(ing.id, 'unit', next);
                  }}
                  style={styles.unitBtn}
                >
                  <Text style={styles.unitText}>{ing.unit}</Text>
                </Pressable>
                <Pressable onPress={() => removeIngredient(ing.id)} style={[styles.iconBtn, ingredients.length === 1 ? { opacity: 0.5 } : null]} disabled={ingredients.length === 1}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {scaled && recipeName.trim() && scaleFactor.trim() ? (
          <>
            <View style={{ height: 12 }} />
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Scaled Recipe</Text>
              <Text style={styles.muted}>
                {recipeName} (×{scaleFactor})
              </Text>
              <View style={{ height: 10 }} />
              {scaled.map((ing) => (
                <View key={ing.id} style={styles.kvRow}>
                  <Text style={styles.kvVal} numberOfLines={1}>
                    {ing.name || 'Unnamed'}
                  </Text>
                  <Text style={{ color: '#fbbf24', fontWeight: '900' }}>
                    {(ing as any).scaledAmount} {ing.unit}
                  </Text>
                </View>
              ))}
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
  muted: { color: '#9aa4b2', marginTop: 6, fontSize: 12, lineHeight: 18 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
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
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  smallBtnText: { color: '#e6e6e6', fontWeight: '900', fontSize: 12 },
  kvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  kvVal: { color: '#e6e6e6', fontSize: 12, fontWeight: '800' },
});

