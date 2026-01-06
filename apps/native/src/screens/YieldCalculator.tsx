import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type Mode = 'solid' | 'liquid';
type ViewMode = 'calculate' | 'saved';

type LiquidIngredient = { name: string; amount: string; unit: 'ml' | 'cl' | 'L' };
type PrepStep = { step_number: number; description: string };

type YieldCalc = {
  id: string;
  ingredient: string;
  rawWeight: number; // raw weight or total input ml
  preparedWeight: number; // prepared weight or final ml
  yieldPercentage: number;
  wastage: number;
  cost: number;
  usableCost: number; // solid: usable cost per unit; liquid: cost per ml
  unit: string;
  mode: Mode;
  inputIngredients?: Array<{ name: string; amount: number; unit: string }>;
  prepSteps?: PrepStep[];
};

type YieldRecipeRow = {
  id: string;
  user_id: string;
  name: string;
  mode: string;
  input_ingredients: any;
  raw_weight: number | null;
  prepared_weight: number | null;
  final_yield_ml: number | null;
  total_cost: number | null;
  unit: string | null;
  yield_percentage: number | null;
  wastage: number | null;
  cost_per_unit: number | null;
  prep_steps: any;
  created_at: string;
};

function toMl(amount: number, unit: string) {
  if (unit === 'L') return amount * 1000;
  if (unit === 'cl') return amount * 10;
  return amount;
}

export default function YieldCalculatorScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('liquid');
  const [viewMode, setViewMode] = useState<ViewMode>('calculate');

  // solid
  const [ingredient, setIngredient] = useState('');
  const [rawWeight, setRawWeight] = useState('');
  const [preparedWeight, setPreparedWeight] = useState('');
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const [costPerUnit, setCostPerUnit] = useState('');

  // liquid
  const [infusionName, setInfusionName] = useState('');
  const [liquidIngredients, setLiquidIngredients] = useState<LiquidIngredient[]>([{ name: '', amount: '', unit: 'ml' }]);
  const [finalYieldMl, setFinalYieldMl] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [prepSteps, setPrepSteps] = useState<string[]>(['']);

  const [calculations, setCalculations] = useState<YieldCalc[]>([]);

  const recipes = useQuery({
    queryKey: ['yield-recipes'],
    enabled: !!user?.id && viewMode === 'saved',
    queryFn: async (): Promise<YieldRecipeRow[]> => {
      const res = await supabase
        .from('yield_recipes')
        .select('id, user_id, name, mode, input_ingredients, raw_weight, prepared_weight, final_yield_ml, total_cost, unit, yield_percentage, wastage, cost_per_unit, prep_steps, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as YieldRecipeRow[];
    },
  });

  const saveRecipe = useMutation({
    mutationFn: async (calc: YieldCalc) => {
      if (!user?.id) throw new Error('Not signed in');
      const res = await supabase.from('yield_recipes').insert({
        user_id: user.id,
        name: calc.ingredient,
        mode: calc.mode,
        input_ingredients: calc.inputIngredients ?? [],
        raw_weight: calc.rawWeight,
        prepared_weight: calc.preparedWeight,
        final_yield_ml: calc.mode === 'liquid' ? calc.preparedWeight : null,
        total_cost: calc.cost,
        unit: calc.unit,
        yield_percentage: calc.yieldPercentage,
        wastage: calc.wastage,
        cost_per_unit: calc.usableCost,
        prep_steps: calc.prepSteps ?? [],
      });
      if (res.error) throw res.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['yield-recipes'] });
    },
  });

  const deleteRecipe = useMutation({
    mutationFn: async (id: string) => {
      const res = await supabase.from('yield_recipes').delete().eq('id', id);
      if (res.error) throw res.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['yield-recipes'] });
    },
  });

  const saveToSpirits = useMutation({
    mutationFn: async (calc: YieldCalc) => {
      if (!user?.id) throw new Error('Not signed in');
      const existing = await supabase.from('master_spirits').select('id').eq('name', calc.ingredient).eq('user_id', user.id).maybeSingle();
      if (existing.data?.id) throw new Error('This ingredient already exists in your Master Spirits list');

      const bottleSizeMl = calc.mode === 'liquid' ? Math.round(calc.preparedWeight) : 1000;
      const res = await supabase.from('master_spirits').insert({
        name: calc.ingredient,
        category: calc.mode === 'liquid' ? 'Infusion' : 'Yield Product',
        bottle_size_ml: bottleSizeMl,
        source_type: 'yield_calculator',
        yield_percentage: calc.yieldPercentage,
        cost_per_unit: calc.usableCost,
        unit: calc.unit,
        user_id: user.id,
      });
      if (res.error) throw res.error;
    },
  });

  function calcSolid() {
    const n = ingredient.trim();
    if (!n || !rawWeight.trim() || !preparedWeight.trim() || !costPerUnit.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    const raw = Number.parseFloat(rawWeight);
    const prepared = Number.parseFloat(preparedWeight);
    const cost = Number.parseFloat(costPerUnit);
    if (!Number.isFinite(raw) || raw <= 0 || !Number.isFinite(prepared) || prepared < 0 || !Number.isFinite(cost) || cost < 0) {
      Alert.alert('Invalid values', 'Please enter valid numeric values.');
      return;
    }
    if (prepared > raw) {
      Alert.alert('Invalid', 'Prepared weight cannot exceed raw weight.');
      return;
    }
    const yieldPercentage = (prepared / raw) * 100;
    const wastage = raw - prepared;
    const usableCost = yieldPercentage > 0 ? cost / (yieldPercentage / 100) : 0;
    const calc: YieldCalc = {
      id: `${Date.now()}`,
      ingredient: n,
      rawWeight: raw,
      preparedWeight: prepared,
      yieldPercentage,
      wastage,
      cost,
      usableCost,
      unit,
      mode: 'solid',
    };
    setCalculations([calc, ...calculations]);
    setIngredient('');
    setRawWeight('');
    setPreparedWeight('');
    setCostPerUnit('');
  }

  function calcLiquid() {
    const name = infusionName.trim();
    if (!name || !finalYieldMl.trim()) {
      Alert.alert('Missing fields', 'Please enter infusion name and final yield.');
      return;
    }
    const valid = liquidIngredients.filter((i) => i.name.trim() && i.amount.trim());
    if (valid.length === 0) {
      Alert.alert('Missing ingredients', 'Please add at least one ingredient.');
      return;
    }
    const totalInputMl = valid.reduce((sum, i) => sum + toMl(Number.parseFloat(i.amount), i.unit), 0);
    const finalMl = Number.parseFloat(finalYieldMl);
    const cost = Number.parseFloat(totalCost || '0') || 0;
    if (!Number.isFinite(totalInputMl) || totalInputMl <= 0 || !Number.isFinite(finalMl) || finalMl <= 0) {
      Alert.alert('Invalid values', 'Please enter valid numeric values.');
      return;
    }
    if (finalMl > totalInputMl) {
      Alert.alert('Invalid', 'Final yield cannot exceed total input volume.');
      return;
    }
    const yieldPercentage = (finalMl / totalInputMl) * 100;
    const wastage = totalInputMl - finalMl;
    const costPerMl = cost > 0 ? cost / finalMl : 0;
    const steps: PrepStep[] = prepSteps
      .map((d, idx) => ({ step_number: idx + 1, description: d.trim() }))
      .filter((s) => s.description);
    const calc: YieldCalc = {
      id: `${Date.now()}`,
      ingredient: name,
      rawWeight: totalInputMl,
      preparedWeight: finalMl,
      yieldPercentage,
      wastage,
      cost,
      usableCost: costPerMl,
      unit: 'ml',
      mode: 'liquid',
      inputIngredients: valid.map((i) => ({ name: i.name.trim(), amount: Number.parseFloat(i.amount), unit: i.unit })),
      prepSteps: steps,
    };
    setCalculations([calc, ...calculations]);
    setInfusionName('');
    setLiquidIngredients([{ name: '', amount: '', unit: 'ml' }]);
    setFinalYieldMl('');
    setTotalCost('');
    setPrepSteps(['']);
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Yield Calculator
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Solid yields & liquid infusions
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Yield Calculator',
              pathTemplate: '/yield-calculator',
            })
          }
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {([
          { key: 'calculate' as const, label: 'Calculate' },
          { key: 'saved' as const, label: 'Saved' },
        ]).map((t) => (
          <Pressable key={t.key} onPress={() => setViewMode(t.key)} style={[styles.tab, viewMode === t.key ? styles.tabActive : null]}>
            <Text style={[styles.tabText, viewMode === t.key ? styles.tabTextActive : null]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        {viewMode === 'calculate' ? (
          <>
            <View style={styles.modeRow}>
              {(['liquid', 'solid'] as const).map((m) => (
                <Pressable key={m} onPress={() => setMode(m)} style={[styles.modePill, mode === m ? styles.modePillActive : null]}>
                  <Text style={[styles.modePillText, mode === m ? styles.modePillTextActive : null]}>{m.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>

            {mode === 'solid' ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Solid yield</Text>
                <Text style={styles.muted}>Yield %, wastage, and usable cost.</Text>
                <View style={{ height: 10 }} />

                <Text style={styles.label}>Ingredient</Text>
                <TextInput value={ingredient} onChangeText={setIngredient} placeholder="e.g., Apples" placeholderTextColor="#6b7280" style={styles.input} />

                <View style={{ height: 10 }} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Raw Weight</Text>
                    <TextInput value={rawWeight} onChangeText={setRawWeight} keyboardType="decimal-pad" placeholder="10" placeholderTextColor="#6b7280" style={styles.input} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Prepared Weight</Text>
                    <TextInput value={preparedWeight} onChangeText={setPreparedWeight} keyboardType="decimal-pad" placeholder="8" placeholderTextColor="#6b7280" style={styles.input} />
                  </View>
                </View>

                <View style={{ height: 10 }} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ width: 110 }}>
                    <Text style={styles.label}>Unit</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {(['kg', 'lb'] as const).map((u) => (
                        <Pressable key={u} onPress={() => setUnit(u)} style={[styles.unitChip, unit === u ? styles.unitChipActive : null]}>
                          <Text style={[styles.unitChipText, unit === u ? styles.unitChipTextActive : null]}>{u}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Cost per Unit ($)</Text>
                    <TextInput value={costPerUnit} onChangeText={setCostPerUnit} keyboardType="decimal-pad" placeholder="2.50" placeholderTextColor="#6b7280" style={styles.input} />
                  </View>
                </View>

                <View style={{ height: 12 }} />
                <Pressable onPress={calcSolid} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Calculate</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Liquid infusion</Text>
                <Text style={styles.muted}>Yield %, wastage, and cost per ml.</Text>
                <View style={{ height: 10 }} />

                <Text style={styles.label}>Infusion Name</Text>
                <TextInput value={infusionName} onChangeText={setInfusionName} placeholder="e.g., Chili Vodka" placeholderTextColor="#6b7280" style={styles.input} />

                <View style={{ height: 10 }} />
                <Text style={styles.sectionTitle}>Input ingredients</Text>
                <View style={{ height: 8 }} />
                {liquidIngredients.map((ing, index) => (
                  <View key={index} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <TextInput
                      value={ing.name}
                      onChangeText={(v) => {
                        const next = [...liquidIngredients];
                        next[index] = { ...next[index], name: v };
                        setLiquidIngredients(next);
                      }}
                      placeholder="Ingredient"
                      placeholderTextColor="#6b7280"
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    />
                    <TextInput
                      value={ing.amount}
                      onChangeText={(v) => {
                        const next = [...liquidIngredients];
                        next[index] = { ...next[index], amount: v };
                        setLiquidIngredients(next);
                      }}
                      keyboardType="decimal-pad"
                      placeholder="Amt"
                      placeholderTextColor="#6b7280"
                      style={[styles.input, { width: 84, marginBottom: 0 }]}
                    />
                    <Pressable
                      onPress={() => {
                        const order: Array<LiquidIngredient['unit']> = ['ml', 'cl', 'L'];
                        const i = order.indexOf(ing.unit);
                        const nextUnit = order[(i + 1) % order.length];
                        const next = [...liquidIngredients];
                        next[index] = { ...next[index], unit: nextUnit };
                        setLiquidIngredients(next);
                      }}
                      style={styles.unitBtn}
                    >
                      <Text style={styles.unitText}>{ing.unit}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        if (liquidIngredients.length <= 1) return;
                        setLiquidIngredients(liquidIngredients.filter((_, i) => i !== index));
                      }}
                      style={[styles.iconBtn, liquidIngredients.length <= 1 ? { opacity: 0.5 } : null]}
                      disabled={liquidIngredients.length <= 1}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </Pressable>
                  </View>
                ))}

                <Pressable onPress={() => setLiquidIngredients([...liquidIngredients, { name: '', amount: '', unit: 'ml' }])} style={styles.smallBtn}>
                  <Text style={styles.smallBtnText}>+ Add ingredient</Text>
                </Pressable>

                <View style={{ height: 12 }} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Final Yield (ml)</Text>
                    <TextInput value={finalYieldMl} onChangeText={setFinalYieldMl} keyboardType="decimal-pad" placeholder="900" placeholderTextColor="#6b7280" style={styles.input} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Total Cost ($, optional)</Text>
                    <TextInput value={totalCost} onChangeText={setTotalCost} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#6b7280" style={styles.input} />
                  </View>
                </View>

                <View style={{ height: 12 }} />
                <Text style={styles.sectionTitle}>Prep steps (optional)</Text>
                <View style={{ height: 8 }} />
                {prepSteps.map((s, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ color: '#9aa4b2', width: 18, fontWeight: '900' }}>{i + 1}.</Text>
                    <TextInput
                      value={s}
                      onChangeText={(v) => {
                        const next = [...prepSteps];
                        next[i] = v;
                        setPrepSteps(next);
                      }}
                      placeholder="Step description…"
                      placeholderTextColor="#6b7280"
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    />
                    <Pressable
                      onPress={() => {
                        if (prepSteps.length <= 1) return;
                        setPrepSteps(prepSteps.filter((_, idx) => idx !== i));
                      }}
                      style={[styles.iconBtn, prepSteps.length <= 1 ? { opacity: 0.5 } : null]}
                      disabled={prepSteps.length <= 1}
                    >
                      <Ionicons name="close" size={18} color="#ef4444" />
                    </Pressable>
                  </View>
                ))}
                <Pressable onPress={() => setPrepSteps([...prepSteps, ''])} style={styles.smallBtn}>
                  <Text style={styles.smallBtnText}>+ Add step</Text>
                </Pressable>

                <View style={{ height: 12 }} />
                <Pressable onPress={calcLiquid} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Calculate</Text>
                </Pressable>
              </View>
            )}

            {calculations.length > 0 ? (
              <>
                <View style={{ height: 12 }} />
                <Text style={styles.listTitle}>Recent calculations</Text>
                <View style={{ height: 10 }} />
                <View style={{ gap: 10 }}>
                  {calculations.map((c) => (
                    <View key={c.id} style={styles.card}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                            {c.ingredient}
                          </Text>
                          <Text style={{ color: '#9aa4b2', marginTop: 2, fontSize: 12 }} numberOfLines={1}>
                            {c.mode.toUpperCase()} • Yield {c.yieldPercentage.toFixed(1)}%
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => setCalculations(calculations.filter((x) => x.id !== c.id))}
                          style={styles.iconBtn}
                          hitSlop={10}
                        >
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </Pressable>
                      </View>

                      <View style={{ height: 10 }} />
                      <View style={styles.kvRow}>
                        <Text style={styles.kvKey}>{c.mode === 'liquid' ? 'Total input' : 'Raw'}</Text>
                        <Text style={styles.kvVal}>
                          {c.rawWeight.toFixed(2)} {c.mode === 'liquid' ? 'ml' : c.unit}
                        </Text>
                      </View>
                      <View style={styles.kvRow}>
                        <Text style={styles.kvKey}>{c.mode === 'liquid' ? 'Final yield' : 'Prepared'}</Text>
                        <Text style={styles.kvVal}>
                          {c.preparedWeight.toFixed(2)} {c.mode === 'liquid' ? 'ml' : c.unit}
                        </Text>
                      </View>
                      <View style={styles.kvRow}>
                        <Text style={styles.kvKey}>Wastage</Text>
                        <Text style={styles.kvVal}>
                          {c.wastage.toFixed(2)} {c.mode === 'liquid' ? 'ml' : c.unit}
                        </Text>
                      </View>
                      <View style={styles.kvRow}>
                        <Text style={styles.kvKey}>{c.mode === 'liquid' ? 'Cost per ml' : 'Usable cost'}</Text>
                        <Text style={styles.kvVal}>${c.usableCost.toFixed(4)}</Text>
                      </View>

                      <View style={{ height: 10 }} />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={() =>
                            saveRecipe
                              .mutateAsync(c)
                              .then(() => Alert.alert('Saved', 'Saved to Yield Recipes.'))
                              .catch((e: any) => Alert.alert('Failed', e?.message ?? 'Unknown error'))
                          }
                          style={[styles.smallBtn, { flex: 1, opacity: saveRecipe.isPending ? 0.6 : 1 }]}
                          disabled={saveRecipe.isPending}
                        >
                          <Text style={styles.smallBtnText}>{saveRecipe.isPending ? 'Saving…' : 'Save as recipe'}</Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            saveToSpirits
                              .mutateAsync(c)
                              .then(() => Alert.alert('Saved', 'Added to Master Spirits.'))
                              .catch((e: any) => Alert.alert('Failed', e?.message ?? 'Unknown error'))
                          }
                          style={[styles.smallBtn, { flex: 1, opacity: saveToSpirits.isPending ? 0.6 : 1 }]}
                          disabled={saveToSpirits.isPending}
                        >
                          <Text style={styles.smallBtnText}>{saveToSpirits.isPending ? 'Saving…' : 'Save to spirits'}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}

        {viewMode === 'saved' ? (
          <>
            {recipes.isLoading ? <Text style={{ color: '#9aa4b2' }}>Loading…</Text> : null}
            {(recipes.data?.length ?? 0) === 0 && !recipes.isLoading ? <Text style={{ color: '#9aa4b2' }}>No saved yield recipes yet.</Text> : null}
            <View style={{ gap: 10 }}>
              {(recipes.data ?? []).map((r) => (
                <View key={r.id} style={styles.card}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                        {r.name}
                      </Text>
                      <Text style={{ color: '#9aa4b2', marginTop: 2, fontSize: 12 }} numberOfLines={1}>
                        {String(r.mode).toUpperCase()} • {new Date(r.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() =>
                        Alert.alert('Delete recipe?', 'This will remove the saved recipe.', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteRecipe.mutate(r.id) },
                        ])
                      }
                      style={styles.iconBtn}
                      hitSlop={10}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </Pressable>
                  </View>

                  <View style={{ height: 10 }} />
                  <View style={styles.kvRow}>
                    <Text style={styles.kvKey}>Yield %</Text>
                    <Text style={styles.kvVal}>{(r.yield_percentage ?? 0).toFixed(1)}%</Text>
                  </View>
                  <View style={styles.kvRow}>
                    <Text style={styles.kvKey}>Wastage</Text>
                    <Text style={styles.kvVal}>{(r.wastage ?? 0).toFixed(2)} {r.unit ?? 'ml'}</Text>
                  </View>
                  <View style={styles.kvRow}>
                    <Text style={styles.kvKey}>Cost per unit</Text>
                    <Text style={styles.kvVal}>${(r.cost_per_unit ?? 0).toFixed(4)}</Text>
                  </View>
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
  tabs: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 10, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  tabActive: { backgroundColor: 'rgba(251,191,36,0.12)', borderColor: 'rgba(251,191,36,0.25)' },
  tabText: { color: '#9aa4b2', fontWeight: '900', fontSize: 12 },
  tabTextActive: { color: '#fff' },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  modePillActive: { backgroundColor: 'rgba(251,191,36,0.12)', borderColor: 'rgba(251,191,36,0.25)' },
  modePillText: { color: '#9aa4b2', fontWeight: '900', fontSize: 12 },
  modePillTextActive: { color: '#fff' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  sectionTitle: { color: '#fff', fontWeight: '900', fontSize: 15 },
  listTitle: { color: '#fff', fontWeight: '900', fontSize: 16, paddingHorizontal: 2 },
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
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: { color: '#e6e6e6', fontWeight: '900', fontSize: 12 },
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
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  unitChipActive: { borderColor: 'rgba(251,191,36,0.35)', backgroundColor: 'rgba(251,191,36,0.12)' },
  unitChipText: { color: '#9aa4b2', fontWeight: '900', fontSize: 12 },
  unitChipTextActive: { color: '#fff' },
  kvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  kvKey: { color: '#9aa4b2', fontSize: 12 },
  kvVal: { color: '#e6e6e6', fontSize: 12, fontWeight: '800' },
});

