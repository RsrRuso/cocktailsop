import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { queryClient } from '../lib/queryClient';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type EquipmentRow = {
  id: string;
  name: string;
  type: string;
  area: string;
  doors: number | null;
  target_temperature: number | null;
};

type TemperatureLogRow = {
  id: string;
  equipment_id: string;
  temperature: number;
  recorded_at: string;
  notes: string | null;
};

const EQUIPMENT_TYPES: Array<{ value: string; label: string; icon: keyof typeof Ionicons.glyphMap; defaultTemp: number }> = [
  { value: 'fridge', label: 'Fridge', icon: 'thermometer-outline', defaultTemp: 5 },
  { value: 'freezer', label: 'Freezer', icon: 'snow-outline', defaultTemp: -18 },
  { value: 'walk_in_fridge', label: 'Walk-in Fridge', icon: 'cube-outline', defaultTemp: 5 },
  { value: 'walk_in_freezer', label: 'Walk-in Freezer', icon: 'cube-outline', defaultTemp: -18 },
  { value: 'chest_freezer', label: 'Chest Freezer', icon: 'cube-outline', defaultTemp: -18 },
  { value: 'under_counter', label: 'Under Counter', icon: 'thermometer-outline', defaultTemp: 5 },
  { value: 'tall_fridge', label: 'Tall Fridge', icon: 'thermometer-outline', defaultTemp: 5 },
  { value: 'chiller', label: 'Chiller', icon: 'cloud-outline', defaultTemp: 2 },
  { value: 'super_freezer', label: 'Super Freezer', icon: 'snow-outline', defaultTemp: -40 },
];

function tempStatus(actual: number, target: number) {
  const diff = Math.abs(actual - target);
  if (diff <= 2) return { color: '#22c55e', label: 'OK' };
  if (diff <= 5) return { color: '#f59e0b', label: 'Warn' };
  return { color: '#ef4444', label: 'Alert' };
}

export default function TemperatureLogScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'log' | 'equipment' | 'history'>('log');
  const [selectedArea, setSelectedArea] = useState<string>('All');
  const [tempById, setTempById] = useState<Record<string, string>>({});
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  // New equipment form
  const [eqName, setEqName] = useState('');
  const [eqType, setEqType] = useState(EQUIPMENT_TYPES[0].value);
  const [eqArea, setEqArea] = useState('');
  const [eqDoors, setEqDoors] = useState('1');
  const [eqTarget, setEqTarget] = useState('5');

  const equipment = useQuery({
    queryKey: ['temperature', 'equipment'],
    queryFn: async (): Promise<EquipmentRow[]> => {
      const res = await supabase.from('equipment').select('id, name, type, area, doors, target_temperature').order('area', { ascending: true });
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as EquipmentRow[];
    },
  });

  const logs = useQuery({
    queryKey: ['temperature', 'logs'],
    queryFn: async (): Promise<TemperatureLogRow[]> => {
      const res = await supabase
        .from('temperature_logs')
        .select('id, equipment_id, temperature, recorded_at, notes')
        .order('recorded_at', { ascending: false })
        .limit(50);
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as TemperatureLogRow[];
    },
  });

  const areas = useMemo(() => {
    const set = new Set<string>();
    for (const e of equipment.data ?? []) if (e.area) set.add(e.area);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [equipment.data]);

  const filteredEquipment = useMemo(() => {
    const list = equipment.data ?? [];
    if (selectedArea === 'All') return list;
    return list.filter((e) => e.area === selectedArea);
  }, [equipment.data, selectedArea]);

  const createEquipment = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not signed in');
      const name = eqName.trim();
      const area = eqArea.trim();
      if (!name || !area) throw new Error('Name and area are required');
      const doors = Number.parseInt(eqDoors || '1', 10);
      const target = Number.parseFloat(eqTarget);
      const res = await supabase.from('equipment').insert([
        {
          user_id: user.id,
          name,
          type: eqType,
          area,
          doors: Number.isFinite(doors) ? doors : 1,
          target_temperature: Number.isFinite(target) ? target : EQUIPMENT_TYPES.find((t) => t.value === eqType)?.defaultTemp ?? 5,
        },
      ]);
      if (res.error) throw res.error;
    },
    onSuccess: async () => {
      setEqName('');
      setEqArea('');
      setEqDoors('1');
      setEqTarget(String(EQUIPMENT_TYPES.find((t) => t.value === eqType)?.defaultTemp ?? 5));
      await queryClient.invalidateQueries({ queryKey: ['temperature', 'equipment'] });
    },
  });

  const addLog = useMutation({
    mutationFn: async ({ equipmentId, temperature, notes }: { equipmentId: string; temperature: number; notes: string }) => {
      if (!user?.id) throw new Error('Not signed in');
      const res = await supabase.from('temperature_logs').insert({
        user_id: user.id,
        equipment_id: equipmentId,
        temperature,
        notes: notes.trim() ? notes.trim() : null,
      });
      if (res.error) throw res.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['temperature', 'logs'] });
    },
  });

  const eqMap = useMemo(() => {
    const m = new Map<string, EquipmentRow>();
    for (const e of equipment.data ?? []) m.set(e.id, e);
    return m;
  }, [equipment.data]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Temperature Log
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Log temps, manage equipment, view history
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Temperature Log',
              pathTemplate: '/temperature-log',
            })
          }
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {([
          { key: 'log' as const, label: 'Log Temp' },
          { key: 'equipment' as const, label: 'Equipment' },
          { key: 'history' as const, label: 'History' },
        ]).map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key ? styles.tabActive : null]}>
            <Text style={[styles.tabText, tab === t.key ? styles.tabTextActive : null]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        {equipment.isLoading || logs.isLoading ? <Text style={{ color: '#9aa4b2' }}>Loading…</Text> : null}

        {tab === 'log' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Filter by Area</Text>
              <View style={{ height: 8 }} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Pressable onPress={() => setSelectedArea('All')} style={[styles.chip, selectedArea === 'All' ? styles.chipActive : null]}>
                  <Text style={[styles.chipText, selectedArea === 'All' ? styles.chipTextActive : null]}>All Areas</Text>
                </Pressable>
                {areas.map((a) => (
                  <Pressable key={a} onPress={() => setSelectedArea(a)} style={[styles.chip, selectedArea === a ? styles.chipActive : null]}>
                    <Text style={[styles.chipText, selectedArea === a ? styles.chipTextActive : null]}>{a}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ height: 12 }} />

            {filteredEquipment.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.muted}>No equipment added yet. Add equipment to start logging temperatures.</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {filteredEquipment.map((e) => {
                  const typeMeta = EQUIPMENT_TYPES.find((t) => t.value === e.type);
                  const icon = typeMeta?.icon ?? 'thermometer-outline';
                  const target = e.target_temperature ?? typeMeta?.defaultTemp ?? 5;
                  const tempInput = tempById[e.id] ?? '';
                  const notesInput = notesById[e.id] ?? '';

                  return (
                    <View key={e.id} style={styles.card}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={styles.iconBox}>
                          <Ionicons name={icon} size={22} color="#fbbf24" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                            {e.name}
                          </Text>
                          <Text style={{ color: '#9aa4b2', marginTop: 2 }} numberOfLines={1}>
                            {typeMeta?.label ?? e.type}
                            {e.doors && e.doors > 1 ? ` • ${e.doors} doors` : ''}
                          </Text>
                        </View>
                      </View>

                      <View style={{ height: 10 }} />

                      <View style={styles.kvRow}>
                        <Text style={styles.kvKey}>Area</Text>
                        <Text style={styles.kvVal}>{e.area}</Text>
                      </View>
                      <View style={styles.kvRow}>
                        <Text style={styles.kvKey}>Target</Text>
                        <Text style={styles.kvVal}>{target}°C</Text>
                      </View>

                      <View style={{ height: 10 }} />

                      <Text style={styles.label}>Current temp (°C)</Text>
                      <TextInput
                        value={tempInput}
                        onChangeText={(v) => setTempById((m) => ({ ...m, [e.id]: v }))}
                        keyboardType="decimal-pad"
                        placeholder="e.g., 4.2"
                        placeholderTextColor="#6b7280"
                        style={styles.input}
                      />
                      <View style={{ height: 8 }} />
                      <Text style={styles.label}>Notes (optional)</Text>
                      <TextInput
                        value={notesInput}
                        onChangeText={(v) => setNotesById((m) => ({ ...m, [e.id]: v }))}
                        placeholder="Notes…"
                        placeholderTextColor="#6b7280"
                        style={styles.input}
                      />
                      <View style={{ height: 10 }} />
                      <Pressable
                        onPress={() => {
                          const t = Number.parseFloat(tempInput);
                          if (!Number.isFinite(t)) {
                            Alert.alert('Invalid temperature', 'Please enter a valid number.');
                            return;
                          }
                          addLog
                            .mutateAsync({ equipmentId: e.id, temperature: t, notes: notesInput })
                            .then(() => {
                              const s = tempStatus(t, target);
                              Alert.alert('Logged', `Saved temperature (${s.label}).`);
                              setTempById((m) => ({ ...m, [e.id]: '' }));
                              setNotesById((m) => ({ ...m, [e.id]: '' }));
                            })
                            .catch((err: any) => Alert.alert('Failed', err?.message ?? 'Unknown error'));
                        }}
                        style={[styles.primaryBtn, addLog.isPending ? { opacity: 0.6 } : null]}
                        disabled={addLog.isPending}
                      >
                        <Text style={styles.primaryBtnText}>{addLog.isPending ? 'Saving…' : 'Log Temperature'}</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        ) : null}

        {tab === 'equipment' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Add Equipment</Text>
            <Text style={styles.muted}>Create equipment to begin temperature logging.</Text>

            <View style={{ height: 12 }} />
            <Text style={styles.label}>Name</Text>
            <TextInput value={eqName} onChangeText={setEqName} placeholder="e.g., Walk-in Fridge" placeholderTextColor="#6b7280" style={styles.input} />
            <View style={{ height: 8 }} />
            <Text style={styles.label}>Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {EQUIPMENT_TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => {
                    setEqType(t.value);
                    setEqTarget(String(t.defaultTemp));
                  }}
                  style={[styles.chip, eqType === t.value ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipText, eqType === t.value ? styles.chipTextActive : null]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ height: 8 }} />
            <Text style={styles.label}>Area</Text>
            <TextInput value={eqArea} onChangeText={setEqArea} placeholder="e.g., Main Bar" placeholderTextColor="#6b7280" style={styles.input} />
            <View style={{ height: 8 }} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Doors</Text>
                <TextInput value={eqDoors} onChangeText={setEqDoors} keyboardType="number-pad" placeholder="1" placeholderTextColor="#6b7280" style={styles.input} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Target (°C)</Text>
                <TextInput value={eqTarget} onChangeText={setEqTarget} keyboardType="decimal-pad" placeholder="5" placeholderTextColor="#6b7280" style={styles.input} />
              </View>
            </View>
            <View style={{ height: 10 }} />
            <Pressable
              onPress={() => createEquipment.mutateAsync().catch((err: any) => Alert.alert('Failed', err?.message ?? 'Unknown error'))}
              style={[styles.primaryBtn, createEquipment.isPending ? { opacity: 0.6 } : null]}
              disabled={createEquipment.isPending}
            >
              <Text style={styles.primaryBtnText}>{createEquipment.isPending ? 'Saving…' : 'Add Equipment'}</Text>
            </Pressable>
          </View>
        ) : null}

        {tab === 'history' ? (
          <View style={{ gap: 10 }}>
            {(logs.data ?? []).map((l) => {
              const eq = eqMap.get(l.equipment_id);
              const typeMeta = eq ? EQUIPMENT_TYPES.find((t) => t.value === eq.type) : undefined;
              const target = eq?.target_temperature ?? typeMeta?.defaultTemp ?? 5;
              const status = tempStatus(l.temperature, target);
              return (
                <View key={l.id} style={styles.card}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                        {eq?.name ?? 'Equipment'}
                      </Text>
                      <Text style={{ color: '#9aa4b2', marginTop: 2 }} numberOfLines={1}>
                        {eq?.area ?? ''} {typeMeta?.label ? `• ${typeMeta.label}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: status.color, fontWeight: '900', fontSize: 16 }}>{l.temperature.toFixed(1)}°C</Text>
                      <Text style={{ color: '#9aa4b2', fontSize: 11, fontWeight: '800' }}>{status.label}</Text>
                    </View>
                  </View>
                  {l.notes ? (
                    <>
                      <View style={{ height: 8 }} />
                      <Text style={{ color: '#9aa4b2' }}>{l.notes}</Text>
                    </>
                  ) : null}
                  <View style={{ height: 8 }} />
                  <Text style={{ color: '#6b7280', fontSize: 12 }}>
                    {new Date(l.recorded_at).toLocaleString()}
                  </Text>
                </View>
              );
            })}
            {(logs.data?.length ?? 0) === 0 ? <Text style={{ color: '#9aa4b2' }}>No logs yet.</Text> : null}
          </View>
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
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  sectionTitle: { color: '#fff', fontWeight: '900', fontSize: 15 },
  muted: { color: '#9aa4b2', marginTop: 6, fontSize: 12, lineHeight: 18 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipActive: { borderColor: 'rgba(251,191,36,0.35)', backgroundColor: 'rgba(251,191,36,0.12)' },
  chipText: { color: '#9aa4b2', fontWeight: '900', fontSize: 11 },
  chipTextActive: { color: '#fff' },
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
  kvRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  kvKey: { color: '#9aa4b2', fontSize: 12 },
  kvVal: { color: '#e6e6e6', fontSize: 12, fontWeight: '800' },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251,191,36,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.20)',
  },
});

