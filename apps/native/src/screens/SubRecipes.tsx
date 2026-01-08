import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';
import { useMixologistGroups } from '../features/ops/batch/queries';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type SubRecipeIngredient = { id: string; name: string; amount: number; unit: string };
type SubRecipePrepStep = { step_number: number; description: string };

type SubRecipeRow = {
  id: string;
  name: string;
  description: string | null;
  total_yield_ml: number;
  ingredients: any;
  prep_steps: any;
  user_id: string;
  group_id: string | null;
  created_at: string;
  updated_at: string;
};

type SubRecipeDepletionRow = {
  id: string;
  sub_recipe_id: string;
  amount_used_ml: number;
  depleted_at: string;
};

function breakdown(recipe: { total_yield_ml: number; ingredients: SubRecipeIngredient[] }, amountMl: number) {
  const ratio = amountMl / recipe.total_yield_ml;
  return recipe.ingredients.map((ing) => ({
    ...ing,
    scaled_amount: Number.parseFloat((ing.amount * ratio).toFixed(2)),
  }));
}

const UNIT_ORDER = ['ml', 'cl', 'L', 'oz'] as const;

export default function SubRecipesScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();
  const groups = useMixologistGroups(user?.id);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [calcRecipeId, setCalcRecipeId] = useState<string>('');
  const [calcAmount, setCalcAmount] = useState<string>('');

  const subRecipes = useQuery({
    queryKey: ['sub-recipes', selectedGroupId ?? null],
    enabled: !!user?.id,
    queryFn: async (): Promise<Array<{
      id: string;
      name: string;
      description?: string;
      total_yield_ml: number;
      ingredients: SubRecipeIngredient[];
      prep_steps: SubRecipePrepStep[];
      user_id: string;
      group_id: string | null;
      created_at: string;
      updated_at: string;
    }>> => {
      const res = await supabase.from('sub_recipes').select('*').order('created_at', { ascending: false });
      if (res.error) throw res.error;

      const rows = (res.data ?? []) as unknown as SubRecipeRow[];
      const filtered = rows.filter((r) => {
        if (selectedGroupId) return r.group_id === selectedGroupId;
        return r.group_id === null && r.user_id === user!.id;
      });

      return filtered.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? undefined,
        total_yield_ml: Number(r.total_yield_ml),
        ingredients: ((r.ingredients ?? []) as unknown as SubRecipeIngredient[]) ?? [],
        prep_steps: ((r.prep_steps ?? []) as unknown as SubRecipePrepStep[]) ?? [],
        user_id: r.user_id,
        group_id: r.group_id,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));
    },
  });

  const depletions = useQuery({
    queryKey: ['sub-recipe-depletions'],
    enabled: !!user?.id,
    queryFn: async (): Promise<SubRecipeDepletionRow[]> => {
      const res = await supabase.from('sub_recipe_depletions').select('id, sub_recipe_id, amount_used_ml, depleted_at').order('depleted_at', { ascending: false }).limit(200);
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as SubRecipeDepletionRow[];
    },
  });

  const totalsByRecipe = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of depletions.data ?? []) {
      m.set(d.sub_recipe_id, (m.get(d.sub_recipe_id) ?? 0) + Number(d.amount_used_ml));
    }
    return m;
  }, [depletions.data]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = subRecipes.data ?? [];
    if (!query) return list;
    return list.filter((r) => r.name.toLowerCase().includes(query));
  }, [q, subRecipes.data]);

  // create/edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [totalYieldMl, setTotalYieldMl] = useState('1000');
  const [ingredients, setIngredients] = useState<Array<{ id: string; name: string; amount: string; unit: string }>>([
    { id: '1', name: '', amount: '', unit: 'ml' },
  ]);
  const [prepSteps, setPrepSteps] = useState<string[]>([]);

  const createSubRecipe = useMutation({
    mutationFn: async (payload: { name: string; description?: string; total_yield_ml: number; ingredients: SubRecipeIngredient[]; prep_steps: SubRecipePrepStep[]; group_id?: string | null }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const insert = await supabase
        .from('sub_recipes')
        .insert([
          {
            name: payload.name,
            description: payload.description ?? null,
            total_yield_ml: payload.total_yield_ml,
            ingredients: JSON.parse(JSON.stringify(payload.ingredients)),
            prep_steps: JSON.parse(JSON.stringify(payload.prep_steps)),
            group_id: payload.group_id ?? null,
            user_id: user.id,
          },
        ])
        .select('id')
        .single();
      if (insert.error) throw insert.error;

      // Auto-add to master_spirits
      const existing = await supabase.from('master_spirits').select('id').eq('name', payload.name).eq('user_id', user.id).maybeSingle();
      if (!existing.data?.id) {
        const insSpirit = await supabase.from('master_spirits').insert({
          name: payload.name,
          category: 'Sub-Recipe',
          bottle_size_ml: payload.total_yield_ml,
          source_type: 'sub_recipe',
          source_id: insert.data.id,
          unit: 'ml',
          user_id: user.id,
        });
        if (insSpirit.error) throw insSpirit.error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sub-recipes'] });
      await queryClient.invalidateQueries({ queryKey: ['master-spirits'] });
    },
  });

  const updateSubRecipe = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { name: string; description?: string; total_yield_ml: number; ingredients: SubRecipeIngredient[]; prep_steps: SubRecipePrepStep[] } }) => {
      const up = await supabase
        .from('sub_recipes')
        .update({
          name: updates.name,
          description: updates.description ?? null,
          total_yield_ml: updates.total_yield_ml,
          ingredients: JSON.parse(JSON.stringify(updates.ingredients)),
          prep_steps: JSON.parse(JSON.stringify(updates.prep_steps)),
        })
        .eq('id', id);
      if (up.error) throw up.error;

      const msUp = await supabase
        .from('master_spirits')
        .update({ name: updates.name, bottle_size_ml: updates.total_yield_ml })
        .eq('source_id', id)
        .eq('source_type', 'sub_recipe');
      if (msUp.error) {
        // don't fail update if master spirits didn't exist
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sub-recipes'] });
      await queryClient.invalidateQueries({ queryKey: ['master-spirits'] });
    },
  });

  const deleteSubRecipe = useMutation({
    mutationFn: async (id: string) => {
      // delete from master spirits first
      await supabase.from('master_spirits').delete().eq('source_id', id).eq('source_type', 'sub_recipe');
      const res = await supabase.from('sub_recipes').delete().eq('id', id);
      if (res.error) throw res.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sub-recipes'] });
      await queryClient.invalidateQueries({ queryKey: ['master-spirits'] });
    },
  });

  function resetForm() {
    setEditingId(null);
    setName('');
    setDescription('');
    setTotalYieldMl('1000');
    setIngredients([{ id: '1', name: '', amount: '', unit: 'ml' }]);
    setPrepSteps([]);
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function openEdit(r: (typeof filtered)[number]) {
    setEditingId(r.id);
    setName(r.name);
    setDescription(r.description ?? '');
    setTotalYieldMl(String(r.total_yield_ml));
    setIngredients(
      (r.ingredients?.length ? r.ingredients : [{ id: '1', name: '', amount: 0, unit: 'ml' }]).map((i) => ({
        id: i.id ?? `${Math.random()}`,
        name: i.name ?? '',
        amount: String(i.amount ?? ''),
        unit: i.unit ?? 'ml',
      })),
    );
    setPrepSteps((r.prep_steps ?? []).map((s) => s.description ?? '').filter((d) => d.trim()));
    setModalOpen(true);
  }

  const calcResult = useMemo(() => {
    const id = calcRecipeId;
    const amt = Number.parseFloat(calcAmount);
    if (!id || !Number.isFinite(amt) || amt <= 0) return null;
    const r = (subRecipes.data ?? []).find((x) => x.id === id);
    if (!r) return null;
    return { recipe: r, items: breakdown(r, amt) };
  }, [calcAmount, calcRecipeId, subRecipes.data]);

  const showGroups = (groups.data?.length ?? 0) > 0;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Sub-Recipes
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Create pre-made mixes to use as ingredients
          </Text>
        </View>
        <Pressable onPress={openCreate} style={styles.smallBtn}>
          <Text style={styles.smallBtnText}>+ New</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <Text style={styles.sectionTitle}>Proportion Calculator</Text>
            <Pressable
              style={[styles.btn, styles.secondaryBtn]}
              onPress={() => navigation.navigate('WebRoute', { title: 'Sub-Recipes', pathTemplate: '/sub-recipes' })}
            >
              <Text style={styles.btnText}>Open web</Text>
            </Pressable>
          </View>
          <Text style={styles.muted}>Calculate ingredient breakdown for any amount of sub-recipe.</Text>

          <View style={{ height: 10 }} />
          <Text style={styles.label}>Select sub-recipe</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {(subRecipes.data ?? []).slice(0, 25).map((r) => (
              <Pressable key={r.id} onPress={() => setCalcRecipeId(r.id)} style={[styles.chip, calcRecipeId === r.id ? styles.chipActive : null]}>
                <Text style={[styles.chipText, calcRecipeId === r.id ? styles.chipTextActive : null]} numberOfLines={1}>
                  {r.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={{ height: 10 }} />
          <Text style={styles.label}>Amount needed (ml)</Text>
          <TextInput value={calcAmount} onChangeText={setCalcAmount} keyboardType="decimal-pad" placeholder="e.g., 500" placeholderTextColor="#6b7280" style={styles.input} />

          {calcResult ? (
            <>
              <View style={{ height: 10 }} />
              <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                {calcResult.recipe.name} breakdown
              </Text>
              <View style={{ height: 8 }} />
              {calcResult.items.map((i) => (
                <View key={i.id} style={styles.kvRow}>
                  <Text style={styles.kvVal} numberOfLines={1}>
                    {i.name}
                  </Text>
                  <Text style={{ color: '#fbbf24', fontWeight: '900' }}>
                    {(i as any).scaled_amount} {i.unit}
                  </Text>
                </View>
              ))}
            </>
          ) : null}
        </View>

        <View style={{ height: 12 }} />

        {showGroups ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Group</Text>
            <Text style={styles.muted}>Choose personal or a mixologist group.</Text>
            <View style={{ height: 10 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pressable onPress={() => setSelectedGroupId(null)} style={[styles.chip, selectedGroupId === null ? styles.chipActive : null]}>
                <Text style={[styles.chipText, selectedGroupId === null ? styles.chipTextActive : null]}>Personal</Text>
              </Pressable>
              {(groups.data ?? []).map((g) => (
                <Pressable key={g.id} onPress={() => setSelectedGroupId(g.id)} style={[styles.chip, selectedGroupId === g.id ? styles.chipActive : null]}>
                  <Text style={[styles.chipText, selectedGroupId === g.id ? styles.chipTextActive : null]} numberOfLines={1}>
                    {g.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Search</Text>
          <View style={{ height: 8 }} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search sub-recipes…" placeholderTextColor="#6b7280" style={styles.input} />
        </View>

        <View style={{ height: 12 }} />

        <Text style={styles.listTitle}>Sub-recipes</Text>
        <View style={{ height: 10 }} />
        {subRecipes.isLoading ? <Text style={{ color: '#9aa4b2' }}>Loading…</Text> : null}
        <View style={{ gap: 10 }}>
          {filtered.map((r) => {
            const expanded = expandedId === r.id;
            const totalDepleted = totalsByRecipe.get(r.id) ?? 0;
            return (
              <View key={r.id} style={styles.card}>
                <Pressable onPress={() => setExpandedId(expanded ? null : r.id)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text style={{ color: '#9aa4b2', marginTop: 2, fontSize: 12 }} numberOfLines={2}>
                      {r.description ?? '—'}
                    </Text>
                    <Text style={{ color: '#9aa4b2', marginTop: 2, fontSize: 12 }} numberOfLines={1}>
                      Yield: {r.total_yield_ml} ml • Used: {totalDepleted.toFixed(0)} ml
                    </Text>
                  </View>
                  <Text style={{ color: '#9aa4b2', fontSize: 18, fontWeight: '900' }}>{expanded ? '−' : '+'}</Text>
                </Pressable>

                <View style={{ height: 10 }} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={() => openEdit(r)} style={[styles.smallBtn, { flex: 1 }]}>
                    <Text style={styles.smallBtnText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      Alert.alert('Delete sub-recipe?', 'This will delete the recipe (and its spirit entry).', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteSubRecipe.mutate(r.id) },
                      ])
                    }
                    style={[styles.smallBtn, { flex: 1, borderColor: 'rgba(239,68,68,0.22)', backgroundColor: 'rgba(239,68,68,0.10)' }]}
                  >
                    <Text style={[styles.smallBtnText, { color: '#fecaca' }]}>Delete</Text>
                  </Pressable>
                </View>

                {expanded ? (
                  <>
                    <View style={{ height: 12 }} />
                    <Text style={{ color: '#fff', fontWeight: '900' }}>Ingredients</Text>
                    <View style={{ height: 6 }} />
                    {(r.ingredients ?? []).map((i) => (
                      <View key={i.id} style={styles.kvRow}>
                        <Text style={styles.kvVal} numberOfLines={1}>
                          {i.name}
                        </Text>
                        <Text style={styles.kvVal}>
                          {i.amount} {i.unit}
                        </Text>
                      </View>
                    ))}
                    {(r.ingredients?.length ?? 0) === 0 ? <Text style={{ color: '#9aa4b2' }}>No ingredients.</Text> : null}

                    <View style={{ height: 10 }} />
                    <Text style={{ color: '#fff', fontWeight: '900' }}>Prep steps</Text>
                    <View style={{ height: 6 }} />
                    {(r.prep_steps ?? []).map((s, idx) => (
                      <Text key={idx} style={{ color: '#9aa4b2', marginBottom: 6 }}>
                        {s.step_number ?? idx + 1}. {s.description}
                      </Text>
                    ))}
                    {(r.prep_steps?.length ?? 0) === 0 ? <Text style={{ color: '#9aa4b2' }}>No steps.</Text> : null}
                  </>
                ) : null}
              </View>
            );
          })}
          {!subRecipes.isLoading && filtered.length === 0 ? <Text style={{ color: '#9aa4b2' }}>No sub-recipes found.</Text> : null}
        </View>
      </ScrollView>

      {modalOpen ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{editingId ? 'Edit sub-recipe' : 'New sub-recipe'}</Text>
              <Pressable onPress={() => { setModalOpen(false); }} hitSlop={10}>
                <Ionicons name="close" size={20} color="#9aa4b2" />
              </Pressable>
            </View>

            <View style={{ height: 10 }} />
            <Text style={styles.label}>Name</Text>
            <TextInput value={name} onChangeText={setName} placeholder="e.g., House Sour Mix" placeholderTextColor="#6b7280" style={styles.input} />
            <View style={{ height: 8 }} />
            <Text style={styles.label}>Description</Text>
            <TextInput value={description} onChangeText={setDescription} placeholder="Optional…" placeholderTextColor="#6b7280" style={styles.input} />
            <View style={{ height: 8 }} />
            <Text style={styles.label}>Total yield (ml)</Text>
            <TextInput value={totalYieldMl} onChangeText={setTotalYieldMl} keyboardType="decimal-pad" placeholder="1000" placeholderTextColor="#6b7280" style={styles.input} />

            <View style={{ height: 10 }} />
            <Text style={{ color: '#fff', fontWeight: '900' }}>Ingredients</Text>
            <View style={{ height: 8 }} />
            <ScrollView style={{ maxHeight: 220 }}>
              {ingredients.map((ing) => (
                <View key={ing.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <TextInput value={ing.name} onChangeText={(v) => setIngredients((arr) => arr.map((x) => (x.id === ing.id ? { ...x, name: v } : x)))} placeholder="Ingredient" placeholderTextColor="#6b7280" style={[styles.input, { flex: 1, marginBottom: 0 }]} />
                  <TextInput value={ing.amount} onChangeText={(v) => setIngredients((arr) => arr.map((x) => (x.id === ing.id ? { ...x, amount: v } : x)))} placeholder="Amt" placeholderTextColor="#6b7280" keyboardType="decimal-pad" style={[styles.input, { width: 84, marginBottom: 0 }]} />
                  <Pressable
                    onPress={() => {
                      const i = UNIT_ORDER.indexOf(ing.unit as any);
                      const next = UNIT_ORDER[(i + 1) % UNIT_ORDER.length];
                      setIngredients((arr) => arr.map((x) => (x.id === ing.id ? { ...x, unit: next } : x)));
                    }}
                    style={styles.unitBtn}
                  >
                    <Text style={styles.unitText}>{ing.unit}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (ingredients.length <= 1) return;
                      setIngredients((arr) => arr.filter((x) => x.id !== ing.id));
                    }}
                    style={[styles.iconBtn, ingredients.length <= 1 ? { opacity: 0.5 } : null]}
                    disabled={ingredients.length <= 1}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            <Pressable onPress={() => setIngredients([...ingredients, { id: `${Date.now()}`, name: '', amount: '', unit: 'ml' }])} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>+ Add ingredient</Text>
            </Pressable>

            <View style={{ height: 10 }} />
            <Text style={{ color: '#fff', fontWeight: '900' }}>Prep steps</Text>
            <View style={{ height: 8 }} />
            <ScrollView style={{ maxHeight: 160 }}>
              {(prepSteps.length ? prepSteps : ['']).map((s, idx) => (
                <View key={idx} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ color: '#9aa4b2', width: 18, fontWeight: '900' }}>{idx + 1}.</Text>
                  <TextInput
                    value={prepSteps[idx] ?? ''}
                    onChangeText={(v) => {
                      setPrepSteps((arr) => {
                        const next = [...(arr.length ? arr : [''])];
                        next[idx] = v;
                        return next;
                      });
                    }}
                    placeholder="Step description…"
                    placeholderTextColor="#6b7280"
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  />
                  <Pressable
                    onPress={() => {
                      setPrepSteps((arr) => {
                        const base = arr.length ? arr : [''];
                        if (base.length <= 1) return base;
                        return base.filter((_, i) => i !== idx);
                      });
                    }}
                    style={[styles.iconBtn, (prepSteps.length || 1) <= 1 ? { opacity: 0.5 } : null]}
                    disabled={(prepSteps.length || 1) <= 1}
                  >
                    <Ionicons name="close" size={18} color="#ef4444" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            <Pressable onPress={() => setPrepSteps((arr) => [...(arr.length ? arr : ['']), ''])} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>+ Add step</Text>
            </Pressable>

            <View style={{ height: 12 }} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => { setModalOpen(false); }} style={[styles.smallBtn, { flex: 1 }]}>
                <Text style={styles.smallBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const n = name.trim();
                  const y = Number.parseFloat(totalYieldMl);
                  const validIngs = ingredients
                    .map((i) => ({ ...i, name: i.name.trim(), amount: Number.parseFloat(i.amount) }))
                    .filter((i) => i.name && Number.isFinite(i.amount) && i.amount > 0)
                    .map((i) => ({ id: i.id, name: i.name, amount: i.amount, unit: i.unit }));
                  if (!n) {
                    Alert.alert('Missing name', 'Please enter a recipe name.');
                    return;
                  }
                  if (!Number.isFinite(y) || y <= 0) {
                    Alert.alert('Invalid yield', 'Total yield must be a positive number.');
                    return;
                  }
                  if (validIngs.length === 0) {
                    Alert.alert('Missing ingredients', 'Add at least one ingredient with amount.');
                    return;
                  }
                  const steps = (prepSteps.length ? prepSteps : [])
                    .map((d, idx) => ({ step_number: idx + 1, description: d.trim() }))
                    .filter((s) => s.description);

                  if (editingId) {
                    updateSubRecipe
                      .mutateAsync({ id: editingId, updates: { name: n, description: description.trim() || undefined, total_yield_ml: y, ingredients: validIngs, prep_steps: steps } })
                      .then(() => {
                        setModalOpen(false);
                      })
                      .catch((e: any) => Alert.alert('Failed', e?.message ?? 'Unknown error'));
                  } else {
                    createSubRecipe
                      .mutateAsync({ name: n, description: description.trim() || undefined, total_yield_ml: y, ingredients: validIngs, prep_steps: steps, group_id: selectedGroupId })
                      .then(() => {
                        setModalOpen(false);
                      })
                      .catch((e: any) => Alert.alert('Failed', e?.message ?? 'Unknown error'));
                  }
                }}
                style={[styles.primaryBtn, { flex: 1, opacity: createSubRecipe.isPending || updateSubRecipe.isPending ? 0.6 : 1 }]}
                disabled={createSubRecipe.isPending || updateSubRecipe.isPending}
              >
                <Text style={styles.primaryBtnText}>{createSubRecipe.isPending || updateSubRecipe.isPending ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
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
  primaryBtn: {
    backgroundColor: '#fbbf24',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#000', fontWeight: '900' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    maxWidth: 220,
  },
  chipActive: { borderColor: 'rgba(251,191,36,0.35)', backgroundColor: 'rgba(251,191,36,0.12)' },
  chipText: { color: '#9aa4b2', fontWeight: '900', fontSize: 11 },
  chipTextActive: { color: '#fff' },
  kvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  kvVal: { color: '#e6e6e6', fontSize: 12, fontWeight: '800' },
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
  modalOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 12,
    justifyContent: 'center',
  },
  modal: {
    backgroundColor: '#0b1220',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 12,
    maxHeight: '92%',
  },
});

