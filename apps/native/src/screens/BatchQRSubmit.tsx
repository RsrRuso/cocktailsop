import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type RecipeLite = {
  id: string;
  recipe_name: string;
  description?: string | null;
  ingredients: Array<{ name: string; amount: number | string; unit: string }>;
  current_serves: number | string;
};

type QRData = {
  id: string;
  user_id: string | null;
  group_id?: string | null;
  recipe_id?: string | null;
  embedded_mode?: boolean;
  fallback_mode?: boolean;
  recipe_data?: any;
};

type ProductionRecord = {
  id: string;
  batch_name: string;
  target_liters: number;
  target_serves: number;
  produced_by_name: string | null;
  production_date: string;
  created_at: string;
};

function parseEmbeddedData(d?: string | null) {
  if (!d) return null;
  try {
    const decoded = decodeURIComponent(d);
    // web uses atob(base64); RN has atob sometimes, but be safe
    const base64 = decoded;
    // eslint-disable-next-line no-undef
    const json = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function BatchQRSubmitScreen({
  route,
  navigation,
}: {
  route: { params?: { qrId?: string; embeddedData?: string } };
  navigation: Nav;
}) {
  const { user } = useAuth();
  const qrId = route.params?.qrId;
  const embeddedDataParam = route.params?.embeddedData;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [recipes, setRecipes] = useState<RecipeLite[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [producedByName, setProducedByName] = useState('');
  const [targetLiters, setTargetLiters] = useState('');
  const [targetServings, setTargetServings] = useState('');
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState<ProductionRecord[]>([]);

  const selectedRecipe = useMemo(() => recipes.find((r) => r.id === selectedRecipeId) ?? null, [recipes, selectedRecipeId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const embedded = parseEmbeddedData(embeddedDataParam);

        if (!qrId && !embedded) {
          setQrData(null);
          return;
        }

        // require auth for submission; QR read can be public
        const userId = user?.id ?? null;

        // PRIORITY 1: embedded mode (universal)
        if (embedded) {
          const recipeFromEmbed: RecipeLite = {
            id: embedded.id || qrId || 'embedded',
            recipe_name: embedded.r,
            description: embedded.d || '',
            ingredients: (embedded.i || []) as any,
            current_serves: embedded.s || 1,
          };
          if (!mounted) return;
          setQrData({ id: qrId || embedded.id || 'embedded', user_id: embedded.u || userId, group_id: embedded.g, embedded_mode: true });
          setRecipes([recipeFromEmbed]);
          setSelectedRecipeId(recipeFromEmbed.id);
          if (user?.id) {
            const prof = await supabase.from('profiles').select('full_name, username').eq('id', user.id).maybeSingle();
            const nm = prof.data?.full_name || prof.data?.username || '';
            setProducedByName(nm);
          }
          return;
        }

        // PRIORITY 2: DB lookup by QR id
        let qrCodeData: any = null;
        if (qrId) {
          const active = await supabase.from('batch_qr_codes').select('id, user_id, group_id, recipe_id, recipe_data, is_active').eq('id', qrId).eq('is_active', true).maybeSingle();
          if (active.data) qrCodeData = active.data;
          else {
            const anyQR = await supabase.from('batch_qr_codes').select('id, user_id, group_id, recipe_id, recipe_data, is_active').eq('id', qrId).maybeSingle();
            if (anyQR.data) qrCodeData = anyQR.data;
          }
        }

        // PRIORITY 3: fallback for logged-in users (load accessible recipes)
        if (!qrCodeData) {
          if (!user?.id) {
            if (!mounted) return;
            setQrData(null);
            return;
          }
          const accessible = await supabase.from('batch_recipes').select('*');
          if (accessible.error) throw accessible.error;
          if (!mounted) return;
          setQrData({ id: qrId || 'fallback', user_id: user.id, fallback_mode: true });
          setRecipes((accessible.data ?? []) as any);
          const prof = await supabase.from('profiles').select('full_name, username').eq('id', user.id).maybeSingle();
          const nm = prof.data?.full_name || prof.data?.username || '';
          setProducedByName(nm);
          return;
        }

        const qrInfo: QRData = {
          id: qrCodeData.id,
          user_id: qrCodeData.user_id ?? null,
          group_id: qrCodeData.group_id ?? null,
          recipe_id: qrCodeData.recipe_id ?? null,
          recipe_data: qrCodeData.recipe_data,
        };

        const recipesData: RecipeLite[] = [];
        // First: recipe_data embedded in qr row
        if (qrCodeData.recipe_data?.recipe_name) {
          recipesData.push({
            id: qrCodeData.recipe_id,
            recipe_name: qrCodeData.recipe_data.recipe_name,
            description: qrCodeData.recipe_data.description || '',
            ingredients: qrCodeData.recipe_data.ingredients || [],
            current_serves: qrCodeData.recipe_data.current_serves || 1,
          });
        }

        // Also try linked recipe table if available (RLS may block; ok)
        if (recipesData.length === 0 && qrCodeData.recipe_id) {
          const linked = await supabase.from('batch_recipes').select('*').eq('id', qrCodeData.recipe_id).maybeSingle();
          if (linked.data) recipesData.push(linked.data as any);
        }

        // Also load any accessible recipes for logged-in users
        if (user?.id) {
          const accessible = await supabase.from('batch_recipes').select('*');
          if (!accessible.error && accessible.data?.length) {
            const existing = new Set(recipesData.map((r) => r.id));
            for (const r of accessible.data as any[]) if (!existing.has(r.id)) recipesData.push(r);
          }
          const prof = await supabase.from('profiles').select('full_name, username').eq('id', user.id).maybeSingle();
          const nm = prof.data?.full_name || prof.data?.username || '';
          setProducedByName(nm);
        }

        if (!mounted) return;
        setQrData(qrInfo);
        setRecipes(recipesData);
        if (recipesData.length === 1) setSelectedRecipeId(recipesData[0].id);
        else if (qrCodeData.recipe_id) {
          const match = recipesData.find((r) => r.id === qrCodeData.recipe_id);
          if (match) setSelectedRecipeId(match.id);
        }
      } catch (e: any) {
        Alert.alert('Failed', e?.message ?? 'Failed to load batch information');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [qrId, embeddedDataParam, user?.id]);

  useEffect(() => {
    if (!selectedRecipe) return;
    (async () => {
      try {
        const nameKey = selectedRecipe.recipe_name.toLowerCase().trim();
        const res = await supabase
          .from('batch_productions')
          .select('id, batch_name, target_liters, target_serves, produced_by_name, production_date, created_at')
          .order('created_at', { ascending: false })
          .limit(200);
        if (res.error) return;
        const filtered = (res.data ?? []).filter((p: any) => (p.batch_name ?? '').toLowerCase().trim() === nameKey);
        setHistory(filtered.slice(0, 5));
      } catch {
        // ignore
      }
    })();
  }, [selectedRecipeId]);

  async function handleSubmit() {
    if (!user?.id) {
      Alert.alert('Sign in required', 'Please sign in to submit batch production.');
      return;
    }
    if (!qrData) return;
    if (!producedByName.trim() || (!targetLiters.trim() && !targetServings.trim()) || !selectedRecipe) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const recipe = selectedRecipe;
      const totalMlPerBatch = (recipe.ingredients ?? []).reduce((sum, ing: any) => sum + Number.parseFloat(String(ing.amount ?? 0)), 0);
      const baseServes = Number.parseFloat(String(recipe.current_serves ?? 1)) || 1;

      let liters: number;
      let servings: number;
      let multiplier: number;

      if (targetLiters.trim()) {
        liters = Number.parseFloat(targetLiters);
        multiplier = totalMlPerBatch > 0 ? (liters * 1000) / totalMlPerBatch : 1;
        servings = baseServes * multiplier;
      } else {
        servings = Number.parseFloat(targetServings);
        multiplier = servings / baseServes;
        const totalMl = totalMlPerBatch * multiplier;
        liters = totalMl / 1000;
      }

      const scaledIngredients = (recipe.ingredients ?? []).map((ing: any) => ({
        ingredient_name: ing.name,
        original_amount: Number.parseFloat(String(ing.amount)),
        scaled_amount: Number.parseFloat(String(ing.amount)) * multiplier,
        unit: ing.unit,
      }));
      const actualServings = Math.round(servings);

      const qrCodeData = JSON.stringify({
        batchName: recipe.recipe_name,
        date: new Date().toISOString(),
        liters: liters.toFixed(2),
        servings: actualServings,
        producedBy: producedByName.trim(),
        ingredients: scaledIngredients,
      });

      const prod = await supabase
        .from('batch_productions')
        .insert({
          recipe_id: recipe.id,
          batch_name: recipe.recipe_name,
          target_serves: actualServings,
          target_liters: liters,
          production_date: new Date().toISOString(),
          produced_by_name: producedByName.trim(),
          produced_by_email: null,
          produced_by_user_id: null,
          qr_code_data: qrCodeData,
          notes: notes.trim() || null,
          group_id: (qrData as any).group_id ?? null,
          user_id: (qrData as any).user_id ?? user.id,
        })
        .select('id')
        .single();
      if (prod.error) throw prod.error;

      const ingInsert = await supabase.from('batch_production_ingredients').insert(
        scaledIngredients.map((ing) => ({
          production_id: prod.data.id,
          ...ing,
        })),
      );
      if (ingInsert.error) throw ingInsert.error;

      Alert.alert('Submitted', 'Batch production submitted successfully!');
      setTargetLiters('');
      setTargetServings('');
      setNotes('');

      // refresh history
      const res = await supabase
        .from('batch_productions')
        .select('id, batch_name, target_liters, target_serves, produced_by_name, production_date, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (!res.error) {
        const nameKey = recipe.recipe_name.toLowerCase().trim();
        const filtered = (res.data ?? []).filter((p: any) => (p.batch_name ?? '').toLowerCase().trim() === nameKey);
        setHistory(filtered.slice(0, 5));
      }
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Failed to submit batch production');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#9aa4b2' }}>Loading batch information…</Text>
      </View>
    );
  }

  if (!qrData) {
    return (
      <View style={[styles.root, { padding: 12 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Batch QR Submit</Text>
            <Text style={styles.sub}>QR code not found</Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={{ color: '#fff', fontWeight: '900' }}>QR Code Outdated</Text>
          <Text style={styles.muted}>This QR code needs to be regenerated.</Text>
          <View style={{ height: 10 }} />
          <Pressable onPress={() => navigation.navigate('WebRoute', { title: 'Batch QR Submit', pathTemplate: '/batch-calculator' })} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>Open Batch Calculator</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Batch QR Submit
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Submit a batch production from QR
          </Text>
        </View>
        <Pressable style={styles.iconBtn} onPress={() => navigation.navigate('WebRoute', { title: 'Batch QR Submit', pathTemplate: `/batch-qr/${qrData.id}` })}>
          <Ionicons name="globe-outline" size={18} color="#9aa4b2" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recipe</Text>
          <View style={{ height: 8 }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {recipes.map((r) => (
              <Pressable key={r.id} onPress={() => setSelectedRecipeId(r.id)} style={[styles.chip, selectedRecipeId === r.id ? styles.chipActive : null]}>
                <Text style={[styles.chipText, selectedRecipeId === r.id ? styles.chipTextActive : null]} numberOfLines={1}>
                  {r.recipe_name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {recipes.length === 0 ? <Text style={styles.muted}>No accessible recipes.</Text> : null}
        </View>

        <View style={{ height: 12 }} />
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Production details</Text>
          <View style={{ height: 10 }} />
          <Text style={styles.label}>Produced by *</Text>
          <TextInput value={producedByName} onChangeText={setProducedByName} placeholder="Name" placeholderTextColor="#6b7280" style={styles.input} />
          <View style={{ height: 10 }} />
          <Text style={styles.label}>Target liters (optional)</Text>
          <TextInput value={targetLiters} onChangeText={(v) => { setTargetLiters(v); if (v.trim()) setTargetServings(''); }} keyboardType="decimal-pad" placeholder="e.g., 10" placeholderTextColor="#6b7280" style={styles.input} />
          <View style={{ height: 10 }} />
          <Text style={styles.label}>Target servings (optional)</Text>
          <TextInput value={targetServings} onChangeText={(v) => { setTargetServings(v); if (v.trim()) setTargetLiters(''); }} keyboardType="decimal-pad" placeholder="e.g., 120" placeholderTextColor="#6b7280" style={styles.input} />
          <View style={{ height: 10 }} />
          <Text style={styles.label}>Notes</Text>
          <TextInput value={notes} onChangeText={setNotes} placeholder="Optional…" placeholderTextColor="#6b7280" style={styles.input} />

          <View style={{ height: 12 }} />
          <Pressable onPress={() => handleSubmit().catch(() => {})} style={[styles.primaryBtn, submitting ? { opacity: 0.6 } : null]} disabled={submitting}>
            <Text style={styles.primaryBtnText}>{submitting ? 'Submitting…' : 'Submit Production'}</Text>
          </Pressable>
          {!user?.id ? <Text style={styles.muted}>Sign in is required to submit.</Text> : null}
        </View>

        {selectedRecipe ? (
          <>
            <View style={{ height: 12 }} />
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Recent history</Text>
              <Text style={styles.muted}>Last 5 submissions for this recipe.</Text>
              <View style={{ height: 10 }} />
              {history.map((p) => (
                <View key={p.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                      {p.batch_name}
                    </Text>
                    <Text style={{ color: '#9aa4b2', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                      {new Date(p.created_at).toLocaleString()} • {p.target_liters?.toFixed?.(2) ?? p.target_liters}L • {p.target_serves} serves
                    </Text>
                  </View>
                </View>
              ))}
              {history.length === 0 ? <Text style={{ color: '#9aa4b2' }}>No history yet.</Text> : null}
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
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  sectionTitle: { color: '#fff', fontWeight: '900', fontSize: 15 },
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
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    maxWidth: 240,
  },
  chipActive: { borderColor: 'rgba(251,191,36,0.35)', backgroundColor: 'rgba(251,191,36,0.12)' },
  chipText: { color: '#9aa4b2', fontWeight: '900', fontSize: 11 },
  chipTextActive: { color: '#fff' },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
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
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  smallBtnText: { color: '#e6e6e6', fontWeight: '900', fontSize: 12 },
});

