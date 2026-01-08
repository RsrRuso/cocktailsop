import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useMixologistGroups } from '../features/ops/batch/queries';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type ActivityRow = {
  id: string;
  user_id: string;
  group_id: string | null;
  session_id: string;
  action_type: string;
  duration_seconds: number | null;
  metadata: any;
  created_at: string;
};

type ProductionRow = {
  id: string;
  batch_name: string;
  target_serves: number | null;
  target_liters: number | null;
  produced_by_name: string | null;
  produced_by_user_id: string | null;
  created_at: string;
  group_id: string | null;
};

type RecipeRow = { id: string; recipe_name: string; user_id: string; created_at: string; group_id?: string | null };

type ProfileLite = { id: string; username: string | null; full_name: string | null };

function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function activityLabel(row: any, profiles: Record<string, string>) {
  const md = row.metadata || {};
  const username = md.produced_by_name || profiles[row.user_id] || 'Team member';
  switch (row.action_type) {
    case 'recipe_complete':
      return `${username} created recipe “${md.recipe_name || 'Unknown'}”`;
    case 'batch_submit':
      return `${username} submitted batch “${md.batch_name || 'Unknown'}”`;
    case 'qr_scan':
      return `${username} scanned QR code`;
    case 'print_action':
      return `${username} printed ${md.type || 'document'}`;
    case 'batch_delete':
      return `${username} deleted batch “${md.batch_name || 'Unknown'}”`;
    case 'recipe_edit':
      return `${username} edited recipe “${md.recipe_name || 'Unknown'}”`;
    case 'recipe_delete':
      return `${username} deleted recipe “${md.recipe_name || 'Unknown'}”`;
    default:
      return `${username} performed ${row.action_type}`;
  }
}

function activityIcon(action: string) {
  if (action === 'recipe_complete') return { icon: 'restaurant-outline' as const, color: '#22c55e' };
  if (action === 'batch_submit') return { icon: 'flask-outline' as const, color: '#3b82f6' };
  if (action === 'qr_scan') return { icon: 'qr-code-outline' as const, color: '#a855f7' };
  if (action === 'print_action') return { icon: 'print-outline' as const, color: '#f59e0b' };
  if (action === 'batch_delete' || action === 'recipe_delete') return { icon: 'trash-outline' as const, color: '#ef4444' };
  if (action === 'recipe_edit') return { icon: 'create-outline' as const, color: '#22d3ee' };
  return { icon: 'pulse-outline' as const, color: '#9aa4b2' };
}

export default function BatchActivityScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();
  const groups = useMixologistGroups(user?.id);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['batch-activity', user?.id ?? null, selectedGroupId ?? null],
    enabled: !!user?.id,
    queryFn: async () => {
      const uid = user!.id;

      // Activity log
      let activityQ = supabase.from('batch_calculator_activity').select('*').order('created_at', { ascending: false });
      if (selectedGroupId) activityQ = activityQ.eq('group_id', selectedGroupId);
      else activityQ = activityQ.eq('user_id', uid);
      const activityRes = await activityQ.limit(500);
      if (activityRes.error) throw activityRes.error;
      const activity = (activityRes.data ?? []) as unknown as ActivityRow[];

      // Batch productions (actual submissions)
      let prodQ = supabase
        .from('batch_productions')
        .select('id, batch_name, target_serves, target_liters, produced_by_name, produced_by_user_id, created_at, group_id')
        .order('created_at', { ascending: false });
      if (selectedGroupId) prodQ = prodQ.eq('group_id', selectedGroupId);
      else prodQ = prodQ.eq('user_id', uid);
      const prodRes = await prodQ.limit(100);
      if (prodRes.error) throw prodRes.error;
      const productions = (prodRes.data ?? []) as unknown as ProductionRow[];

      // Recipes created
      let recipesQ = supabase.from('batch_recipes').select('id, recipe_name, created_at, user_id, group_id').order('created_at', { ascending: false });
      if (selectedGroupId) recipesQ = recipesQ.eq('group_id', selectedGroupId);
      else recipesQ = recipesQ.eq('user_id', uid);
      const recipesRes = await recipesQ.limit(100);
      if (recipesRes.error) throw recipesRes.error;
      const recipes = (recipesRes.data ?? []) as unknown as RecipeRow[];

      // Stats like web
      const pageExits = activity.filter((a) => a.action_type === 'page_exit');
      const totalTimeSpent = pageExits.reduce((sum, a) => sum + (a.duration_seconds || 0), 0);
      const recipeCompletes = activity.filter((a) => a.action_type === 'recipe_complete');
      const avgRecipeTime = recipeCompletes.length
        ? Math.round(recipeCompletes.reduce((sum, a) => sum + (a.duration_seconds || 0), 0) / recipeCompletes.length)
        : 0;
      const batchSubmits = activity.filter((a) => a.action_type === 'batch_submit' && (a.duration_seconds || 0) > 0);
      const avgBatchTime = batchSubmits.length
        ? Math.round(batchSubmits.reduce((sum, a) => sum + (a.duration_seconds || 0), 0) / batchSubmits.length)
        : 0;
      const batchTimes = batchSubmits.map((a) => a.duration_seconds || 0).filter((t) => t > 0);
      const fastestBatch = batchTimes.length ? Math.min(...batchTimes) : 0;
      const slowestBatch = batchTimes.length ? Math.max(...batchTimes) : 0;
      const sessionsCount = new Set(activity.map((a) => a.session_id)).size || 1;

      const totalBatchesSubmitted = productions.length;
      const totalRecipesCreated = recipes.length;

      // Recent activity composition like web
      const productionActivities = productions.map((p) => ({
        id: p.id,
        action_type: 'batch_submit',
        created_at: p.created_at,
        user_id: p.produced_by_user_id ?? '',
        duration_seconds: null,
        metadata: { batch_name: p.batch_name, target_serves: p.target_serves, target_liters: p.target_liters, produced_by_name: p.produced_by_name },
      }));
      const recipeActivities = recipes.map((r) => ({
        id: r.id,
        action_type: 'recipe_complete',
        created_at: r.created_at,
        user_id: r.user_id,
        duration_seconds: null,
        metadata: { recipe_name: r.recipe_name },
      }));
      const batchSubmitLogs = batchSubmits;
      const meaningfulLogs = activity.filter((a) => ['qr_scan', 'print_action', 'batch_delete', 'recipe_edit', 'recipe_delete'].includes(a.action_type));

      const allActivity = [...productionActivities, ...recipeActivities, ...batchSubmitLogs, ...meaningfulLogs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 30);

      // Profile map for names
      const ids = Array.from(new Set(allActivity.map((a) => a.user_id).filter(Boolean)));
      let profilesMap: Record<string, string> = {};
      if (ids.length) {
        const profRes = await supabase.from('profiles').select('id, username, full_name').in('id', ids);
        if (!profRes.error) {
          const rows = (profRes.data ?? []) as unknown as ProfileLite[];
          profilesMap = Object.fromEntries(rows.map((p) => [p.id, p.full_name || p.username || 'Unknown']));
        }
      }

      return {
        stats: {
          totalTimeSpent,
          avgRecipeCreationTime: avgRecipeTime,
          avgBatchSubmissionTime: avgBatchTime,
          totalRecipesCreated,
          totalBatchesSubmitted,
          sessionsCount,
          fastestBatchTime: fastestBatch,
          slowestBatchTime: slowestBatch,
        },
        recentActivity: allActivity,
        profiles: profilesMap,
      };
    },
  });

  const filteredActivity = useMemo(() => {
    const list = data?.recentActivity ?? [];
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) => activityLabel(a, data?.profiles ?? {}).toLowerCase().includes(q));
  }, [data?.recentActivity, data?.profiles, filter]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Batch Activity
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Monitor production metrics and team activity
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() => navigation.navigate('WebRoute', { title: 'Batch Activity', pathTemplate: '/batch-activity' })}
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        {(groups.data?.length ?? 0) > 0 ? (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="people-outline" size={16} color="#9aa4b2" />
              <Text style={{ color: '#e6e6e6', fontWeight: '900' }}>Filter by Group</Text>
            </View>
            <View style={{ height: 10 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pressable onPress={() => setSelectedGroupId(null)} style={[styles.chip, selectedGroupId === null ? styles.chipActive : null]}>
                <Text style={[styles.chipText, selectedGroupId === null ? styles.chipTextActive : null]}>Personal</Text>
              </Pressable>
              {(groups.data ?? []).map((g) => (
                <Pressable key={g.id} onPress={() => setSelectedGroupId(g.id)} style={[styles.chip, selectedGroupId === g.id ? styles.chipActive : null]}>
                  <Text style={[styles.chipText, selectedGroupId === g.id ? styles.chipTextActive : null]}>{g.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Pressable onPress={() => refetch()} style={styles.iconBtn} hitSlop={10}>
              <Ionicons name="refresh" size={18} color="#9aa4b2" />
            </Pressable>
          </View>

          {isLoading || !data ? <Text style={{ color: '#9aa4b2', marginTop: 10 }}>Loading…</Text> : null}
          {data ? (
            <>
              <View style={{ height: 10 }} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <StatCard label="Total time spent" value={fmtDuration(data.stats.totalTimeSpent)} color="rgba(59,130,246,0.18)" />
                <StatCard label="Avg batch time" value={fmtDuration(data.stats.avgBatchSubmissionTime)} color="rgba(245,158,11,0.18)" />
              </View>
              <View style={{ height: 10 }} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <StatCard label="Recipes created" value={String(data.stats.totalRecipesCreated)} color="rgba(34,197,94,0.18)" />
                <StatCard label="Batches submitted" value={String(data.stats.totalBatchesSubmitted)} color="rgba(59,130,246,0.18)" />
              </View>
              <View style={{ height: 10 }} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <StatCard label="Fastest batch" value={fmtDuration(data.stats.fastestBatchTime)} color="rgba(34,197,94,0.18)" />
                <StatCard label="Slowest batch" value={fmtDuration(data.stats.slowestBatchTime)} color="rgba(239,68,68,0.18)" />
              </View>
              <View style={{ height: 10 }} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <StatCard label="Sessions" value={String(data.stats.sessionsCount)} color="rgba(168,85,247,0.18)" />
                <StatCard label="Avg recipe time" value={fmtDuration(data.stats.avgRecipeCreationTime)} color="rgba(34,197,94,0.18)" />
              </View>
            </>
          ) : null}
        </View>

        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <View style={{ height: 10 }} />
          <TextInput value={filter} onChangeText={setFilter} placeholder="Search activity…" placeholderTextColor="#6b7280" style={styles.input} />
          <View style={{ height: 10 }} />
          <View style={{ gap: 10 }}>
            {filteredActivity.map((a) => {
              const meta = activityIcon(a.action_type);
              const extra = a.metadata?.target_serves ? `${a.metadata.target_serves} serves, ${a.metadata.target_liters || 0}L` : null;
              return (
                <View key={`${a.action_type}-${a.id}`} style={styles.activityRow}>
                  <View style={[styles.activityIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                    <Ionicons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#e6e6e6', fontWeight: '800' }} numberOfLines={2}>
                      {activityLabel(a, data?.profiles ?? {})}
                    </Text>
                    <Text style={{ color: '#9aa4b2', marginTop: 4, fontSize: 12 }} numberOfLines={2}>
                      {timeAgo(a.created_at)}
                      {a.duration_seconds && a.duration_seconds > 0 ? ` • ${fmtDuration(a.duration_seconds)}` : ''}
                      {extra ? ` • ${extra}` : ''}
                    </Text>
                  </View>
                </View>
              );
            })}
            {!isLoading && filteredActivity.length === 0 ? <Text style={{ color: '#9aa4b2' }}>No activity yet.</Text> : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: color }]}>
      <Text style={{ color: '#9aa4b2', fontSize: 11, fontWeight: '900' }}>{label.toUpperCase()}</Text>
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 6 }}>{value}</Text>
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
  statCard: { flex: 1, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
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
});

