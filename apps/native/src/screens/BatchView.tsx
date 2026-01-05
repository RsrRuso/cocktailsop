import React, { useMemo } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { env } from '../lib/env';
import { useBatchProductionById, useProductionIngredients } from '../features/ops/batch/queries';

type Nav = { goBack: () => void };

export default function BatchViewScreen({ navigation, route }: { navigation: Nav; route: any }) {
  const productionId = String(route?.params?.productionId ?? '');
  const { user } = useAuth();
  const userId = user?.id;

  const prodQ = useBatchProductionById(userId, productionId || undefined);
  const prod = useMemo(() => prodQ.data ?? null, [prodQ.data]);
  const ingQ = useProductionIngredients(productionId || undefined);

  async function openWeb() {
    const base = env.webBaseUrl?.trim();
    if (!base) {
      Alert.alert('Missing web URL', 'Set EXPO_PUBLIC_WEB_BASE_URL to enable opening the web view.');
      return;
    }
    const url = `${base.replace(/\/$/, '')}/batch-view/${productionId}`;
    await Linking.openURL(url);
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Batch View
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Production details
          </Text>
        </View>
        <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => openWeb()} disabled={!productionId}>
          <Text style={styles.btnText}>Open web PDF</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 12 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Production</Text>
          {!prod && prodQ.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
          {!prod && !prodQ.isLoading ? <Text style={styles.muted}>Production not found.</Text> : null}
          {prod ? (
            <View style={{ gap: 6, marginTop: 8 }}>
              <Text style={styles.kv}>
                <Text style={styles.k}>Name: </Text>
                {prod.batch_name}
              </Text>
              <Text style={styles.kv}>
                <Text style={styles.k}>Serves: </Text>
                {Number(prod.target_serves ?? 0)}
              </Text>
              <Text style={styles.kv}>
                <Text style={styles.k}>Liters: </Text>
                {Number(prod.target_liters ?? 0)}
              </Text>
              {prod.produced_by_name ? (
                <Text style={styles.kv}>
                  <Text style={styles.k}>Producer: </Text>
                  {prod.produced_by_name}
                </Text>
              ) : null}
              {prod.qr_code_data ? (
                <Text style={styles.kv}>
                  <Text style={styles.k}>QR link: </Text>
                  {prod.qr_code_data}
                </Text>
              ) : null}
              {prod.notes ? (
                <Text style={styles.kv}>
                  <Text style={styles.k}>Notes: </Text>
                  {prod.notes}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {ingQ.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
          {(ingQ.data ?? []).length === 0 && !ingQ.isLoading ? <Text style={styles.muted}>No ingredients recorded.</Text> : null}
          <View style={{ gap: 8, marginTop: 10 }}>
            {(ingQ.data ?? []).map((i) => (
              <View key={i.id} style={styles.ingLine}>
                <Text style={{ color: '#fff', fontWeight: '900', flex: 1 }} numberOfLines={1}>
                  {i.ingredient_name}
                </Text>
                <Text style={{ color: '#9aa4b2', fontSize: 12 }}>
                  {Number(i.scaled_amount ?? 0).toFixed(2)} {i.unit}
                </Text>
              </View>
            ))}
          </View>
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
  kv: { color: '#fff', lineHeight: 20 },
  k: { color: '#9aa4b2', fontWeight: '900' },
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
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
});

