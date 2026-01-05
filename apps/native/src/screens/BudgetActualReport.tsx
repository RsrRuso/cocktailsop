import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addDays, addMonths, endOfMonth, endOfQuarter, endOfWeek, endOfYear, format, startOfMonth, startOfQuarter, startOfWeek, startOfYear, subDays, subMonths } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type Nav = { goBack: () => void; navigate: (name: string, params?: any) => void };
type DateRange = 'week' | 'month' | 'quarter' | 'year';

type BudgetRow = {
  id: string;
  user_id: string;
  category: string;
  budget_amount: number;
  period: string;
  period_start: string; // YYYY-MM-DD
  period_end: string; // YYYY-MM-DD
  notes: string | null;
};

type ActualRow = {
  id: string;
  user_id: string;
  category: string;
  actual_amount: number;
  transaction_date: string; // YYYY-MM-DD
  description: string | null;
  source: string | null;
};

const CATEGORIES = ['Revenue', 'Food Cost', 'Beverage Cost', 'Labor', 'Rent', 'Utilities', 'Marketing', 'Supplies', 'Equipment', 'Insurance', 'Other'] as const;

function money(n: number) {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function getPeriodDates(range: DateRange, date: Date) {
  if (range === 'week') return { start: startOfWeek(date), end: endOfWeek(date) };
  if (range === 'quarter') return { start: startOfQuarter(date), end: endOfQuarter(date) };
  if (range === 'year') return { start: startOfYear(date), end: endOfYear(date) };
  return { start: startOfMonth(date), end: endOfMonth(date) };
}

function navigateDate(range: DateRange, date: Date, dir: 'prev' | 'next') {
  const add = dir === 'next';
  if (range === 'week') return add ? addDays(date, 7) : subDays(date, 7);
  if (range === 'quarter') return add ? addMonths(date, 3) : subMonths(date, 3);
  if (range === 'year') return add ? addMonths(date, 12) : subMonths(date, 12);
  return add ? addMonths(date, 1) : subMonths(date, 1);
}

export default function BudgetActualReportScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [range, setRange] = useState<DateRange>('month');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const { start, end } = useMemo(() => getPeriodDates(range, currentDate), [range, currentDate]);
  const startStr = useMemo(() => format(start, 'yyyy-MM-dd'), [start]);
  const endStr = useMemo(() => format(end, 'yyyy-MM-dd'), [end]);

  const qc = useQueryClient();

  const budgetsQ = useQuery({
    queryKey: ['reports', 'budget-actual', 'budgets', userId, range, startStr, endStr],
    enabled: !!userId,
    queryFn: async (): Promise<BudgetRow[]> => {
      const res = await supabase
        .from('budgets')
        .select('id, user_id, category, budget_amount, period, period_start, period_end, notes')
        .eq('user_id', userId)
        .eq('period', range)
        .gte('period_start', startStr)
        .lte('period_end', endStr);
      if (res.error) throw res.error;
      return (res.data ?? []) as any;
    },
  });

  const actualsQ = useQuery({
    queryKey: ['reports', 'budget-actual', 'actuals', userId, startStr, endStr],
    enabled: !!userId,
    queryFn: async (): Promise<ActualRow[]> => {
      const res = await supabase
        .from('budget_actuals')
        .select('id, user_id, category, actual_amount, transaction_date, description, source')
        .eq('user_id', userId)
        .gte('transaction_date', startStr)
        .lte('transaction_date', endStr)
        .order('transaction_date', { ascending: false });
      if (res.error) throw res.error;
      return (res.data ?? []) as any;
    },
  });

  const budgets = budgetsQ.data ?? [];
  const actuals = actualsQ.data ?? [];

  const categoryData = useMemo(() => {
    const set = new Set<string>(CATEGORIES as unknown as string[]);
    for (const b of budgets) set.add(b.category);
    for (const a of actuals) set.add(a.category);
    const names = Array.from(set.values());

    return names
      .map((name) => {
        const budget = budgets.filter((b) => b.category === name).reduce((s, b) => s + Number(b.budget_amount ?? 0), 0);
        const actual = actuals.filter((a) => a.category === name).reduce((s, a) => s + Number(a.actual_amount ?? 0), 0);
        const variance = actual - budget;
        const variancePercent = budget > 0 ? (variance / budget) * 100 : 0;
        const abs = Math.abs(variancePercent);
        const onTrack = abs <= 5;
        const status = onTrack ? 'on-track' : variance > 0 ? 'over' : 'under';
        return { name, budget, actual, variance, variancePercent, status };
      })
      .filter((c) => c.budget > 0 || c.actual > 0)
      .sort((a, b) => (a.name === 'Revenue' ? -1 : b.name === 'Revenue' ? 1 : a.name.localeCompare(b.name)));
  }, [budgets, actuals]);

  const totals = useMemo(() => {
    const totalBudget = categoryData.reduce((s, c) => s + c.budget, 0);
    const totalActual = categoryData.reduce((s, c) => s + c.actual, 0);
    const variance = totalActual - totalBudget;
    const variancePercent = totalBudget > 0 ? (variance / totalBudget) * 100 : 0;
    const revenueBudget = categoryData.find((c) => c.name === 'Revenue')?.budget ?? 0;
    const revenueActual = categoryData.find((c) => c.name === 'Revenue')?.actual ?? 0;
    const expenseBudget = categoryData.filter((c) => c.name !== 'Revenue').reduce((s, c) => s + c.budget, 0);
    const expenseActual = categoryData.filter((c) => c.name !== 'Revenue').reduce((s, c) => s + c.actual, 0);
    return { totalBudget, totalActual, variance, variancePercent, revenueBudget, revenueActual, expenseBudget, expenseActual };
  }, [categoryData]);

  // Budget modal state
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetRow | null>(null);
  const [budgetCategory, setBudgetCategory] = useState<string>('Revenue');
  const [budgetAmount, setBudgetAmount] = useState<string>('');
  const [budgetNotes, setBudgetNotes] = useState<string>('');

  // Actual modal state
  const [actualModalOpen, setActualModalOpen] = useState(false);
  const [editingActual, setEditingActual] = useState<ActualRow | null>(null);
  const [actualCategory, setActualCategory] = useState<string>('Food Cost');
  const [actualAmount, setActualAmount] = useState<string>('');
  const [actualDesc, setActualDesc] = useState<string>('');
  const [actualDate, setActualDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const saveBudget = useMutation({
    mutationFn: async () => {
      const amt = Number(budgetAmount);
      if (!budgetCategory || !Number.isFinite(amt)) throw new Error('Enter category and amount.');
      const payload = {
        user_id: userId,
        category: budgetCategory,
        budget_amount: amt,
        period: range,
        period_start: startStr,
        period_end: endStr,
        notes: budgetNotes.trim() || null,
      };
      if (editingBudget) {
        const res = await supabase.from('budgets').update(payload as any).eq('id', editingBudget.id).eq('user_id', userId);
        if (res.error) throw res.error;
      } else {
        const res = await supabase.from('budgets').insert(payload as any);
        if (res.error) throw res.error;
      }
      return true;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['reports', 'budget-actual'] });
      setBudgetModalOpen(false);
      setEditingBudget(null);
      setBudgetAmount('');
      setBudgetNotes('');
    },
  });

  const deleteBudget = useMutation({
    mutationFn: async (id: string) => {
      const res = await supabase.from('budgets').delete().eq('id', id).eq('user_id', userId);
      if (res.error) throw res.error;
      return true;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['reports', 'budget-actual'] });
    },
  });

  const saveActual = useMutation({
    mutationFn: async () => {
      const amt = Number(actualAmount);
      if (!actualCategory || !Number.isFinite(amt)) throw new Error('Enter category and amount.');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(actualDate)) throw new Error('Date must be YYYY-MM-DD.');
      const payload = {
        user_id: userId,
        category: actualCategory,
        actual_amount: amt,
        transaction_date: actualDate,
        description: actualDesc.trim() || null,
        source: 'manual',
      };
      if (editingActual) {
        const res = await supabase.from('budget_actuals').update(payload as any).eq('id', editingActual.id).eq('user_id', userId);
        if (res.error) throw res.error;
      } else {
        const res = await supabase.from('budget_actuals').insert(payload as any);
        if (res.error) throw res.error;
      }
      return true;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['reports', 'budget-actual'] });
      setActualModalOpen(false);
      setEditingActual(null);
      setActualAmount('');
      setActualDesc('');
      setActualDate(format(new Date(), 'yyyy-MM-dd'));
    },
  });

  const deleteActual = useMutation({
    mutationFn: async (id: string) => {
      const res = await supabase.from('budget_actuals').delete().eq('id', id).eq('user_id', userId);
      if (res.error) throw res.error;
      return true;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['reports', 'budget-actual'] });
    },
  });

  const loading = budgetsQ.isLoading || actualsQ.isLoading;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Budget vs Actual
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {format(start, 'MMM d, yyyy')} – {format(end, 'MMM d, yyyy')}
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'Budget vs Actual',
              pathTemplate: '/reports/budget-actual',
            })
          }
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 110, gap: 12 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Period</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {(['week', 'month', 'quarter', 'year'] as const).map((r) => (
              <Pressable key={r} style={[styles.pill, range === r ? styles.pillOn : null]} onPress={() => setRange(r)}>
                <Text style={styles.pillText}>{r.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Pressable style={[styles.btn, styles.secondaryBtn, { flex: 1 }]} onPress={() => setCurrentDate((d) => navigateDate(range, d, 'prev'))}>
              <Text style={styles.btnText}>Prev</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.secondaryBtn, { flex: 1 }]} onPress={() => setCurrentDate((d) => navigateDate(range, d, 'next'))}>
              <Text style={styles.btnText}>Next</Text>
            </Pressable>
          </View>
          <Text style={styles.muted}>Budgets are scoped to the selected period; actuals are transactions within the date range.</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Total Budget</Text>
            <Text style={styles.metricValue}>{money(totals.totalBudget)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Total Actual</Text>
            <Text style={styles.metricValue}>{money(totals.totalActual)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Variance</Text>
            <Text style={[styles.metricValue, { color: totals.variance <= 0 ? '#34d399' : '#f87171' }]}>{money(totals.variance)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Variance %</Text>
            <Text style={[styles.metricValue, { color: totals.variancePercent <= 0 ? '#34d399' : '#f87171' }]}>{totals.variancePercent.toFixed(1)}%</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <Pressable
              style={[styles.btn, styles.primaryBtn, { flex: 1 }]}
              onPress={() => {
                setEditingBudget(null);
                setBudgetCategory('Revenue');
                setBudgetAmount('');
                setBudgetNotes('');
                setBudgetModalOpen(true);
              }}
            >
              <Text style={styles.btnText}>Set budget</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.primaryBtn, { flex: 1 }]}
              onPress={() => {
                setEditingActual(null);
                setActualCategory('Food Cost');
                setActualAmount('');
                setActualDesc('');
                setActualDate(format(new Date(), 'yyyy-MM-dd'));
                setActualModalOpen(true);
              }}
            >
              <Text style={styles.btnText}>Add actual</Text>
            </Pressable>
          </View>
          {loading ? <Text style={styles.muted}>Loading…</Text> : null}
          {!loading && categoryData.length === 0 ? <Text style={styles.muted}>No budgets or actuals yet for this period.</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {categoryData.map((c) => (
              <Pressable
                key={c.name}
                style={styles.row}
                onPress={() => {
                  const existing = budgets.find((b) => b.category === c.name) ?? null;
                  setEditingBudget(existing);
                  setBudgetCategory(c.name);
                  setBudgetAmount(existing ? String(existing.budget_amount) : String(c.budget || 0));
                  setBudgetNotes(existing?.notes ?? '');
                  setBudgetModalOpen(true);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{c.name}</Text>
                  <Text style={styles.rowSub}>
                    Budget {money(c.budget)} • Actual {money(c.actual)} • {c.variancePercent.toFixed(1)}%
                  </Text>
                </View>
                <Text style={[styles.rowVal, { color: c.variance <= 0 ? '#34d399' : '#f87171' }]}>{money(c.variance)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Transactions (Actuals)</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {actuals.slice(0, 30).map((a) => (
              <Pressable
                key={a.id}
                style={styles.row}
                onPress={() => {
                  setEditingActual(a);
                  setActualCategory(a.category);
                  setActualAmount(String(a.actual_amount));
                  setActualDesc(a.description ?? '');
                  setActualDate(a.transaction_date);
                  setActualModalOpen(true);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{a.description?.trim() ? a.description : a.category}</Text>
                  <Text style={styles.rowSub}>
                    {a.category} • {a.transaction_date}
                  </Text>
                </View>
                <Text style={styles.rowVal}>{money(Number(a.actual_amount ?? 0))}</Text>
              </Pressable>
            ))}
            {actuals.length === 0 && !loading ? <Text style={styles.muted}>No actual transactions yet.</Text> : null}
          </View>
        </View>
      </ScrollView>

      {/* Budget modal */}
      <Modal visible={budgetModalOpen} transparent animationType="fade" onRequestClose={() => setBudgetModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editingBudget ? 'Edit budget' : 'Set budget'}</Text>
            <Text style={styles.muted}>Applies to: {format(start, 'MMM d')} – {format(end, 'MMM d')}</Text>

            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(CATEGORIES as unknown as string[]).map((c) => (
                <Pressable key={c} style={[styles.pill, budgetCategory === c ? styles.pillOn : null]} onPress={() => setBudgetCategory(c)}>
                  <Text style={styles.pillText}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>Budget amount</Text>
            <TextInput value={budgetAmount} onChangeText={setBudgetAmount} placeholder="0.00" placeholderTextColor="#6b7280" keyboardType="decimal-pad" style={styles.input} />

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput value={budgetNotes} onChangeText={setBudgetNotes} placeholder="Notes…" placeholderTextColor="#6b7280" style={[styles.input, { height: 70 }]} multiline />

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              {editingBudget ? (
                <Pressable
                  style={[styles.btn, styles.dangerBtn, { flex: 1 }]}
                  onPress={() => {
                    Alert.alert('Delete budget?', `${editingBudget.category}`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteBudget.mutate(editingBudget.id) },
                    ]);
                  }}
                  disabled={deleteBudget.isPending}
                >
                  <Text style={styles.btnText}>{deleteBudget.isPending ? '…' : 'Delete'}</Text>
                </Pressable>
              ) : null}
              <Pressable style={[styles.btn, styles.secondaryBtn, { flex: 1 }]} onPress={() => setBudgetModalOpen(false)}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.primaryBtn, { flex: 1 }]} onPress={() => saveBudget.mutate()} disabled={saveBudget.isPending}>
                <Text style={styles.btnText}>{saveBudget.isPending ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Actual modal */}
      <Modal visible={actualModalOpen} transparent animationType="fade" onRequestClose={() => setActualModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editingActual ? 'Edit actual' : 'Add actual'}</Text>

            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(CATEGORIES as unknown as string[]).map((c) => (
                <Pressable key={c} style={[styles.pill, actualCategory === c ? styles.pillOn : null]} onPress={() => setActualCategory(c)}>
                  <Text style={styles.pillText}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>Amount</Text>
            <TextInput value={actualAmount} onChangeText={setActualAmount} placeholder="0.00" placeholderTextColor="#6b7280" keyboardType="decimal-pad" style={styles.input} />

            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput value={actualDate} onChangeText={setActualDate} placeholder="2026-01-05" placeholderTextColor="#6b7280" style={styles.input} />

            <Text style={styles.label}>Description (optional)</Text>
            <TextInput value={actualDesc} onChangeText={setActualDesc} placeholder="Description…" placeholderTextColor="#6b7280" style={[styles.input, { height: 70 }]} multiline />

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              {editingActual ? (
                <Pressable
                  style={[styles.btn, styles.dangerBtn, { flex: 1 }]}
                  onPress={() => {
                    Alert.alert('Delete transaction?', `${editingActual.category} • ${editingActual.transaction_date}`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteActual.mutate(editingActual.id) },
                    ]);
                  }}
                  disabled={deleteActual.isPending}
                >
                  <Text style={styles.btnText}>{deleteActual.isPending ? '…' : 'Delete'}</Text>
                </Pressable>
              ) : null}
              <Pressable style={[styles.btn, styles.secondaryBtn, { flex: 1 }]} onPress={() => setActualModalOpen(false)}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.primaryBtn, { flex: 1 }]} onPress={() => saveActual.mutate()} disabled={saveActual.isPending}>
                <Text style={styles.btnText}>{saveActual.isPending ? 'Saving…' : 'Save'}</Text>
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
  label: { color: '#9aa4b2', fontSize: 12, fontWeight: '900' },
  btn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { backgroundColor: 'rgba(59,130,246,0.35)', borderColor: 'rgba(59,130,246,0.55)' },
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' },
  dangerBtn: { backgroundColor: 'rgba(239,68,68,0.18)', borderColor: 'rgba(239,68,68,0.40)' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pillOn: { borderColor: 'rgba(59,130,246,0.70)', backgroundColor: 'rgba(59,130,246,0.25)' },
  pillText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  metricLabel: { color: '#9aa4b2', fontSize: 12, fontWeight: '900' },
  metricValue: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 10,
    borderRadius: 12,
  },
  rowTitle: { color: '#fff', fontWeight: '900' },
  rowSub: { color: '#9aa4b2', marginTop: 2, fontSize: 12 },
  rowVal: { color: '#fff', fontWeight: '900' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.60)', alignItems: 'center', justifyContent: 'center', padding: 16 },
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
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});

