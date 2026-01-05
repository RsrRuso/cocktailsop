import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useBatchRecipes, useMixologistGroups } from '../features/ops/batch/queries';
import { useCreateBatchRecipe, useDeleteBatchRecipe, useUpdateBatchRecipe } from '../features/ops/batch/mutations';
import type { BatchIngredient, BatchRecipeLite } from '../features/ops/batch/types';

type Nav = { goBack: () => void };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function BatchRecipesScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();
  const userId = user?.id;

  // Note: For now, recipes are listed without group filtering (RLS already scopes).
  const recipesQ = useBatchRecipes(userId);
  const create = useCreateBatchRecipe(userId);
  const update = useUpdateBatchRecipe(userId);
  const del = useDeleteBatchRecipe(userId);

  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = recipesQ.data ?? [];
    if (!query) return list;
    return list.filter((r) => r.recipe_name.toLowerCase().includes(query));
  }, [recipesQ.data, q]);

  const [edit, setEdit] = useState<{ open: boolean; mode: 'create' | 'edit'; recipe?: BatchRecipeLite }>({ open: false, mode: 'create' });
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [serves, setServes] = useState('1');
  const [ings, setIngs] = useState<BatchIngredient[]>([{ id: uid(), name: '', amount: '', unit: 'ml' }]);

  function openCreate() {
    setEdit({ open: true, mode: 'create' });
    setName('');
    setDesc('');
    setServes('1');
    setIngs([{ id: uid(), name: '', amount: '', unit: 'ml' }]);
  }

  function openEdit(r: BatchRecipeLite) {
    setEdit({ open: true, mode: 'edit', recipe: r });
    setName(r.recipe_name);
    setDesc(r.description ?? '');
    setServes(String(r.current_serves ?? 1));
    setIngs((r.ingredients ?? []).map((i) => ({ id: i.id || uid(), name: i.name, amount: i.amount, unit: i.unit })) || [{ id: uid(), name: '', amount: '', unit: 'ml' }]);
  }

  async function save() {
    try {
      const payload = {
        recipe_name: name,
        description: desc,
        current_serves: Number(serves),
        ingredients: ings,
      };
      if (edit.mode === 'create') {
        await create.mutateAsync(payload);
      } else {
        const id = edit.recipe?.id;
        if (!id) throw new Error('Missing recipe id');
        await update.mutateAsync({ id, ...payload });
      }
      setEdit({ open: false, mode: 'create' });
      Alert.alert('Saved', 'Recipe saved.');
      recipesQ.refetch();
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Could not save recipe.');
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
            Batch Recipes
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Templates for batch productions
          </Text>
        </View>
        <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => openCreate()} disabled={!userId}>
          <Text style={styles.btnText}>+ New</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 10 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recipes</Text>
          <TextInput value={q} onChangeText={setQ} placeholder="Search…" placeholderTextColor="#6b7280" style={styles.search} />
          {recipesQ.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
          {filtered.length === 0 && !recipesQ.isLoading ? <Text style={styles.muted}>No recipes.</Text> : null}
          <View style={{ gap: 10, marginTop: 10 }}>
            {filtered.map((r) => (
              <View key={r.id} style={styles.row}>
                <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                  {r.recipe_name}
                </Text>
                <Text style={{ color: '#9aa4b2', fontSize: 12, marginTop: 2 }} numberOfLines={2}>
                  Serves {Number(r.current_serves ?? 1)} • {(r.ingredients ?? []).length} ingredients
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => openEdit(r)}>
                    <Text style={styles.btnText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.btn, styles.dangerBtn]}
                    onPress={() => {
                      Alert.alert('Delete recipe?', r.recipe_name, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => del.mutate({ id: r.id }) },
                      ]);
                    }}
                    disabled={del.isPending}
                  >
                    <Text style={styles.btnText}>{del.isPending ? '…' : 'Delete'}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={edit.open} transparent animationType="fade" onRequestClose={() => setEdit({ open: false, mode: 'create' })}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{edit.mode === 'create' ? 'New recipe' : 'Edit recipe'}</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Recipe name" placeholderTextColor="#6b7280" style={styles.input} />
            <TextInput value={serves} onChangeText={setServes} placeholder="Current serves" placeholderTextColor="#6b7280" keyboardType="decimal-pad" style={styles.input} />
            <TextInput value={desc} onChangeText={setDesc} placeholder="Description (optional)" placeholderTextColor="#6b7280" style={[styles.input, { height: 70 }]} multiline />
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <ScrollView style={{ maxHeight: 260 }}>
              {ings.map((i) => (
                <View key={i.id} style={styles.ingRow}>
                  <TextInput
                    value={i.name}
                    onChangeText={(t) => setIngs((arr) => arr.map((x) => (x.id === i.id ? { ...x, name: t } : x)))}
                    placeholder="Name"
                    placeholderTextColor="#6b7280"
                    style={[styles.input, { flex: 1 }]}
                  />
                  <TextInput
                    value={i.amount}
                    onChangeText={(t) => setIngs((arr) => arr.map((x) => (x.id === i.id ? { ...x, amount: t } : x)))}
                    placeholder="Amt"
                    placeholderTextColor="#6b7280"
                    style={[styles.input, { width: 90 }]}
                  />
                  <TextInput
                    value={i.unit}
                    onChangeText={(t) => setIngs((arr) => arr.map((x) => (x.id === i.id ? { ...x, unit: t } : x)))}
                    placeholder="Unit"
                    placeholderTextColor="#6b7280"
                    style={[styles.input, { width: 70 }]}
                  />
                  <Pressable
                    style={[styles.btn, styles.secondaryBtn, { flex: 0 }]}
                    onPress={() => setIngs((arr) => (arr.length <= 1 ? arr : arr.filter((x) => x.id !== i.id)))}
                  >
                    <Text style={styles.btnText}>–</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => setIngs((arr) => [...arr, { id: uid(), name: '', amount: '', unit: 'ml' }])}>
              <Text style={styles.btnText}>+ Add ingredient</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => setEdit({ open: false, mode: 'create' })}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.primaryBtn]} onPress={() => save()} disabled={create.isPending || update.isPending}>
                <Text style={styles.btnText}>{create.isPending || update.isPending ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  search: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  row: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  primaryBtn: { backgroundColor: 'rgba(59,130,246,0.35)', borderColor: 'rgba(59,130,246,0.55)' },
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' },
  dangerBtn: { backgroundColor: 'rgba(239,68,68,0.18)', borderColor: 'rgba(239,68,68,0.40)' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.60)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#0b1220',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
    gap: 10,
  },
  modalTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  ingRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
});

