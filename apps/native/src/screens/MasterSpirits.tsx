import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { queryClient } from '../lib/queryClient';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type MasterSpirit = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  bottle_size_ml: number;
  user_id: string;
  source_type?: string | null;
  source_id?: string | null;
  unit?: string | null;
  yield_percentage?: number | null;
  cost_per_unit?: number | null;
  created_at: string;
  updated_at: string;
};

function sourceBadge(type?: string | null) {
  if (type === 'sub_recipe') return { label: 'Sub-Recipe', bg: 'rgba(251,191,36,0.14)', border: 'rgba(251,191,36,0.30)', text: '#fbbf24' };
  if (type === 'yield_calculator') return { label: 'Yield Product', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)', text: '#22c55e' };
  if (type === 'batch_recipe') return { label: 'Batch Recipe', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)', text: '#3b82f6' };
  return null;
}

export default function MasterSpiritsScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();
  const [q, setQ] = useState('');

  const spirits = useQuery({
    queryKey: ['master-spirits'],
    queryFn: async (): Promise<MasterSpirit[]> => {
      const res = await supabase.from('master_spirits').select('*').order('name', { ascending: true });
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as MasterSpirit[];
    },
  });

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = spirits.data ?? [];
    if (!query) return list;
    return list.filter((s) => `${s.name} ${s.brand ?? ''} ${s.category ?? ''}`.toLowerCase().includes(query));
  }, [q, spirits.data]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [bottleSizeMl, setBottleSizeMl] = useState('');

  const createSpirit = useMutation({
    mutationFn: async (payload: { name: string; brand?: string; category?: string; bottle_size_ml: number }) => {
      if (!user?.id) throw new Error('Not authenticated');
      const res = await supabase
        .from('master_spirits')
        .insert([{ ...payload, user_id: user.id }])
        .select('*')
        .maybeSingle();
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['master-spirits'] });
    },
  });

  const updateSpirit = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MasterSpirit> }) => {
      const res = await supabase.from('master_spirits').update(updates).eq('id', id).select('*').maybeSingle();
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['master-spirits'] });
    },
  });

  const deleteSpirit = useMutation({
    mutationFn: async (id: string) => {
      // mirror web behavior: if derived from sub_recipe or yield_calculator, delete the source too
      const fetch = await supabase.from('master_spirits').select('source_type, source_id').eq('id', id).maybeSingle();
      if (fetch.error) throw fetch.error;
      const st = (fetch.data as any)?.source_type as string | null | undefined;
      const sid = (fetch.data as any)?.source_id as string | null | undefined;

      if (sid) {
        if (st === 'sub_recipe') {
          await supabase.from('sub_recipes').delete().eq('id', sid);
        } else if (st === 'yield_calculator') {
          await supabase.from('yield_recipes').delete().eq('id', sid);
        }
      }

      const res = await supabase.from('master_spirits').delete().eq('id', id);
      if (res.error) throw res.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['master-spirits'] });
      await queryClient.invalidateQueries({ queryKey: ['sub-recipes'] });
      await queryClient.invalidateQueries({ queryKey: ['yield-recipes'] });
    },
  });

  function openCreate() {
    setEditingId(null);
    setName('');
    setBrand('');
    setCategory('');
    setBottleSizeMl('');
    setModalOpen(true);
  }

  function openEdit(s: MasterSpirit) {
    setEditingId(s.id);
    setName(s.name);
    setBrand(s.brand ?? '');
    setCategory(s.category ?? '');
    setBottleSizeMl(String(s.bottle_size_ml));
    setModalOpen(true);
  }

  async function save() {
    const n = name.trim();
    const b = brand.trim();
    const c = category.trim();
    const size = Number.parseFloat(bottleSizeMl);
    if (!n || !Number.isFinite(size) || size <= 0) {
      Alert.alert('Missing fields', 'Please fill in spirit name and bottle size.');
      return;
    }
    try {
      if (editingId) {
        await updateSpirit.mutateAsync({ id: editingId, updates: { name: n, brand: b || null, category: c || null, bottle_size_ml: size } as any });
      } else {
        await createSpirit.mutateAsync({ name: n, brand: b || undefined, category: c || undefined, bottle_size_ml: size });
      }
      setModalOpen(false);
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Unknown error');
    }
  }

  async function deleteAll() {
    const list = spirits.data ?? [];
    if (list.length === 0) {
      Alert.alert('Nothing to delete', 'No spirits in the master list.');
      return;
    }
    Alert.alert('Delete all?', `Delete ALL ${list.length} spirits? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete all',
        style: 'destructive',
        onPress: async () => {
          try {
            for (const s of list) {
              await deleteSpirit.mutateAsync(s.id);
            }
          } catch (e: any) {
            Alert.alert('Failed', e?.message ?? 'Unknown error');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Master Spirits List
          </Text>
          <Text style={styles.sub} numberOfLines={2}>
            Edit and delete items below.
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() => navigation.navigate('WebRoute', { title: 'Master Spirits (web)', pathTemplate: '/master-spirits' })}
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={openCreate} style={[styles.smallBtn, { flex: 1 }]}>
            <Text style={styles.smallBtnText}>+ Add</Text>
          </Pressable>
          <Pressable onPress={() => deleteAll().catch(() => {})} style={[styles.smallBtn, { flex: 1, borderColor: 'rgba(239,68,68,0.22)', backgroundColor: 'rgba(239,68,68,0.10)' }]}>
            <Text style={[styles.smallBtnText, { color: '#fecaca' }]}>Delete All</Text>
          </Pressable>
        </View>

        <View style={{ height: 10 }} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search spirits by name, brand, or category…" placeholderTextColor="#6b7280" style={styles.input} />

        <View style={{ height: 12 }} />

        {spirits.isLoading ? <Text style={{ color: '#9aa4b2' }}>Loading spirits…</Text> : null}
        {!spirits.isLoading && (spirits.data?.length ?? 0) === 0 ? (
          <View style={styles.card}>
            <Text style={{ color: '#9aa4b2' }}>No spirits in master list yet.</Text>
          </View>
        ) : null}
        {!spirits.isLoading && (spirits.data?.length ?? 0) > 0 && filtered.length === 0 ? (
          <View style={styles.card}>
            <Text style={{ color: '#9aa4b2' }}>No spirits matching “{q.trim()}”.</Text>
          </View>
        ) : null}

        <View style={{ gap: 10 }}>
          {filtered.map((s) => {
            const badge = sourceBadge(s.source_type ?? undefined);
            return (
              <View key={s.id} style={styles.card}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }} numberOfLines={1}>
                        {s.name}
                      </Text>
                      {badge ? (
                        <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                          <Text style={{ color: badge.text, fontWeight: '900', fontSize: 11 }}>{badge.label}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ color: '#9aa4b2', marginTop: 4, fontSize: 12 }}>
                      {s.brand ? `Brand: ${s.brand}  ` : ''}
                      {s.category ? `Category: ${s.category}  ` : ''}
                      <Text style={{ color: '#fbbf24', fontWeight: '900' }}>
                        {(s.source_type ?? '') === 'sub_recipe' ? 'Yield' : 'Bottle'}: {s.bottle_size_ml}ml
                      </Text>
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable onPress={() => openEdit(s)} style={styles.iconBtn} hitSlop={10}>
                      <Ionicons name="create-outline" size={18} color="#e6e6e6" />
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        Alert.alert(`Delete ${s.name}?`, 'This will remove it from the master list.', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteSpirit.mutate(s.id) },
                        ])
                      }
                      style={[styles.iconBtn, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.18)' }]}
                      hitSlop={10}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {modalOpen ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{editingId ? 'Edit Spirit' : 'Add New Spirit'}</Text>
              <Pressable onPress={() => setModalOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color="#9aa4b2" />
              </Pressable>
            </View>
            <View style={{ height: 10 }} />
            <Text style={styles.label}>Spirit Name *</Text>
            <TextInput value={name} onChangeText={setName} placeholder="e.g., Vodka" placeholderTextColor="#6b7280" style={styles.input} />
            <View style={{ height: 8 }} />
            <Text style={styles.label}>Brand</Text>
            <TextInput value={brand} onChangeText={setBrand} placeholder="e.g., Grey Goose" placeholderTextColor="#6b7280" style={styles.input} />
            <View style={{ height: 8 }} />
            <Text style={styles.label}>Category</Text>
            <TextInput value={category} onChangeText={setCategory} placeholder="e.g., Gin" placeholderTextColor="#6b7280" style={styles.input} />
            <View style={{ height: 8 }} />
            <Text style={styles.label}>Bottle Size (ml) *</Text>
            <TextInput value={bottleSizeMl} onChangeText={setBottleSizeMl} keyboardType="decimal-pad" placeholder="750" placeholderTextColor="#6b7280" style={styles.input} />

            <View style={{ height: 12 }} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => setModalOpen(false)} style={[styles.smallBtn, { flex: 1 }]}>
                <Text style={styles.smallBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => save().catch(() => {})}
                style={[styles.primaryBtn, { flex: 1, opacity: createSpirit.isPending || updateSpirit.isPending ? 0.6 : 1 }]}
                disabled={createSpirit.isPending || updateSpirit.isPending}
              >
                <Text style={styles.primaryBtnText}>{createSpirit.isPending || updateSpirit.isPending ? 'Saving…' : 'Save'}</Text>
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
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  primaryBtn: {
    backgroundColor: '#fbbf24',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#000', fontWeight: '900' },
  sectionTitle: { color: '#fff', fontWeight: '900', fontSize: 15 },
  subText: { color: '#9aa4b2' },
  label: { color: '#e6e6e6', fontWeight: '800', fontSize: 12, marginBottom: 6 },
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

