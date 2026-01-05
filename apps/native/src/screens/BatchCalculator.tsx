import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useBatchProductions, useBatchRecipes, useMixologistGroups } from '../features/ops/batch/queries';
import { useCreateBatchProduction } from '../features/ops/batch/mutations';
import type { BatchRecipeLite } from '../features/ops/batch/types';
import type { BatchStaffSession } from '../features/ops/batch/staffSession';

type Nav = { goBack: () => void; navigate: (name: string, params?: any) => void };

export default function BatchCalculatorScreen({ navigation, route }: { navigation: Nav; route: any }) {
  const { user } = useAuth();
  const userId = user?.id;

  const staffSession: BatchStaffSession | null | undefined = route?.params?.staffSession ?? null;
  const staffGroupId = staffSession?.group?.id ?? null;

  const groupsQ = useMixologistGroups(userId);
  const recipesQ = useBatchRecipes(userId, { staffSession, groupId: staffGroupId });

  const [groupId, setGroupId] = useState<string | null>(staffGroupId);
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [targetServes, setTargetServes] = useState('1');
  const [targetLiters, setTargetLiters] = useState('0');
  const [notes, setNotes] = useState('');

  const productionsQ = useBatchProductions(userId, groupId, { staffSession });
  const createProd = useCreateBatchProduction(userId);

  const recipe: BatchRecipeLite | undefined = useMemo(() => {
    const list = recipesQ.data ?? [];
    return list.find((r) => r.id === recipeId);
  }, [recipesQ.data, recipeId]);

  const scaled = useMemo(() => {
    if (!recipe) return [];
    const t = Number(targetServes);
    const c = Number(recipe.current_serves ?? 1);
    const factor = c > 0 && Number.isFinite(t) ? t / c : 1;
    return (recipe.ingredients ?? []).map((ing) => {
      const orig = Number(String(ing.amount ?? '').trim().replace(/[^0-9.\-]/g, '')) || 0;
      return { ...ing, original: orig, scaled: orig * factor };
    });
  }, [recipe, targetServes]);

  async function submit() {
    try {
      if (!recipe) {
        Alert.alert('Missing recipe', 'Select a recipe first.');
        return;
      }
      if (staffSession && groupId !== staffSession.group.id) {
        setGroupId(staffSession.group.id);
      }
      const id = await createProd.mutateAsync({
        recipe: { id: recipe.id, recipe_name: recipe.recipe_name, current_serves: recipe.current_serves, ingredients: recipe.ingredients },
        group_id: staffSession?.group?.id ?? groupId,
        target_serves: Number(targetServes),
        target_liters: Number(targetLiters),
        produced_by_name: staffSession?.name || user?.user_metadata?.full_name || user?.email || undefined,
        notes,
      });
      Alert.alert('Created', 'Batch production saved.');
      navigation.navigate('BatchView', { productionId: id, staffSession });
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Could not create production.');
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Batch Calculator
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Scale a recipe and log a production
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 12 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Group (optional)</Text>
          <Text style={styles.muted}>Leave blank for personal batches.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
            <Pressable style={[styles.pill, groupId === null ? styles.pillOn : null]} onPress={() => setGroupId(null)}>
              <Text style={styles.pillText}>Personal</Text>
            </Pressable>
            {(groupsQ.data ?? []).map((g) => (
              <Pressable key={g.id} style={[styles.pill, groupId === g.id ? styles.pillOn : null]} onPress={() => setGroupId(g.id)}>
                <Text style={styles.pillText} numberOfLines={1}>
                  {g.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {staffSession ? (
            <Text style={styles.muted}>
              Staff mode: locked to {staffSession.group.name}. Use “Batch PIN Access” to switch group.
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recipe</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
            {(recipesQ.data ?? []).map((r) => (
              <Pressable key={r.id} style={[styles.pill, recipeId === r.id ? styles.pillOn : null]} onPress={() => setRecipeId(r.id)}>
                <Text style={styles.pillText} numberOfLines={1}>
                  {r.recipe_name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {!recipesQ.isLoading && (recipesQ.data ?? []).length === 0 ? <Text style={styles.muted}>No recipes yet. Create one in “Batch Recipes”.</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Targets</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Target serves</Text>
              <TextInput value={targetServes} onChangeText={setTargetServes} keyboardType="decimal-pad" style={styles.input} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Target liters</Text>
              <TextInput value={targetLiters} onChangeText={setTargetLiters} keyboardType="decimal-pad" style={styles.input} />
            </View>
          </View>
          <Text style={[styles.label, { marginTop: 10 }]}>Notes (optional)</Text>
          <TextInput value={notes} onChangeText={setNotes} style={[styles.input, { height: 70 }]} multiline />
        </View>

        {recipe ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Scaled ingredients</Text>
            <Text style={styles.muted}>
              Scaling factor = {Number(targetServes) || 0} / {Number(recipe.current_serves) || 1}
            </Text>
            <View style={{ gap: 8, marginTop: 10 }}>
              {scaled.map((i) => (
                <View key={i.id} style={styles.ingLine}>
                  <Text style={{ color: '#fff', fontWeight: '900', flex: 1 }} numberOfLines={1}>
                    {i.name}
                  </Text>
                  <Text style={{ color: '#9aa4b2', fontSize: 12 }}>
                    {Number.isFinite(i.scaled) ? i.scaled.toFixed(2) : '0.00'} {i.unit}
                  </Text>
                </View>
              ))}
            </View>
            <Pressable style={[styles.btn, styles.primaryBtn, { marginTop: 12 }]} onPress={() => submit()} disabled={createProd.isPending}>
              <Text style={styles.btnText}>{createProd.isPending ? 'Saving…' : 'Save production'}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recent productions</Text>
          {productionsQ.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
          {(productionsQ.data ?? []).slice(0, 8).map((p) => (
            <Pressable key={p.id} style={styles.row} onPress={() => navigation.navigate('BatchView', { productionId: p.id, staffSession })}>
              <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                {p.batch_name}
              </Text>
              <Text style={{ color: '#9aa4b2', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                Serves {Number(p.target_serves ?? 0)} • Liters {Number(p.target_liters ?? 0)}
              </Text>
            </Pressable>
          ))}
          {!productionsQ.isLoading && (productionsQ.data ?? []).length === 0 ? <Text style={styles.muted}>No productions yet.</Text> : null}
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
  },
  sectionTitle: { color: '#fff', fontWeight: '900' },
  muted: { color: '#9aa4b2', marginTop: 8, fontSize: 12, lineHeight: 18 },
  label: { color: '#9aa4b2', fontSize: 12, fontWeight: '800' },
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
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    maxWidth: 200,
  },
  pillOn: { borderColor: 'rgba(59,130,246,0.70)', backgroundColor: 'rgba(59,130,246,0.25)' },
  pillText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  ingLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 10,
    borderRadius: 12,
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: { backgroundColor: 'rgba(59,130,246,0.35)', borderColor: 'rgba(59,130,246,0.55)' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  row: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});

