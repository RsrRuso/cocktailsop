import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type Spirit = { id: string; name: string; volume: string; abv: string };

export default function ABVCalculatorScreen({ navigation }: { navigation: Nav }) {
  const [cocktailName, setCocktailName] = useState('');
  const [spirits, setSpirits] = useState<Spirit[]>([{ id: '1', name: '', volume: '', abv: '' }]);

  const result = useMemo(() => {
    const valid = spirits.filter((s) => s.volume.trim() && s.abv.trim());
    if (valid.length === 0) return null;
    const totalVolume = valid.reduce((sum, s) => sum + Number.parseFloat(s.volume), 0);
    const totalAlcohol = valid.reduce((sum, s) => sum + (Number.parseFloat(s.volume) * Number.parseFloat(s.abv)) / 100, 0);
    if (!Number.isFinite(totalVolume) || totalVolume <= 0 || !Number.isFinite(totalAlcohol)) return null;
    const finalABV = (totalAlcohol / totalVolume) * 100;
    return { totalVolume, totalAlcohol, finalABV };
  }, [spirits]);

  function addSpirit() {
    setSpirits([...spirits, { id: `${Date.now()}`, name: '', volume: '', abv: '' }]);
  }
  function removeSpirit(id: string) {
    if (spirits.length <= 1) return;
    setSpirits(spirits.filter((s) => s.id !== id));
  }
  function updateSpirit(id: string, field: keyof Spirit, value: string) {
    setSpirits(spirits.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            ABV Calculator
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Calculate alcohol by volume
          </Text>
        </View>
        <Pressable
          style={[styles.btn, styles.secondaryBtn]}
          onPress={() =>
            navigation.navigate('WebRoute', {
              title: 'ABV Calculator',
              pathTemplate: '/abv-calculator',
            })
          }
        >
          <Text style={styles.btnText}>Open web</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cocktail Name</Text>
          <View style={{ height: 8 }} />
          <TextInput value={cocktailName} onChangeText={setCocktailName} placeholder="e.g., Negroni" placeholderTextColor="#6b7280" style={styles.input} />

          <View style={{ height: 12 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.sectionTitle}>Ingredients with Alcohol</Text>
            <Pressable onPress={addSpirit} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>+ Add</Text>
            </Pressable>
          </View>

          <View style={{ height: 10 }} />
          <View style={{ gap: 8 }}>
            {spirits.map((s) => (
              <View key={s.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput
                  value={s.name}
                  onChangeText={(v) => updateSpirit(s.id, 'name', v)}
                  placeholder="Spirit name"
                  placeholderTextColor="#6b7280"
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                />
                <TextInput
                  value={s.volume}
                  onChangeText={(v) => updateSpirit(s.id, 'volume', v)}
                  placeholder="ml"
                  placeholderTextColor="#6b7280"
                  keyboardType="decimal-pad"
                  style={[styles.input, { width: 84, marginBottom: 0 }]}
                />
                <TextInput
                  value={s.abv}
                  onChangeText={(v) => updateSpirit(s.id, 'abv', v)}
                  placeholder="%"
                  placeholderTextColor="#6b7280"
                  keyboardType="decimal-pad"
                  style={[styles.input, { width: 72, marginBottom: 0 }]}
                />
                <Pressable
                  onPress={() => {
                    if (spirits.length === 1) {
                      Alert.alert('Cannot remove', 'At least one ingredient is required.');
                      return;
                    }
                    removeSpirit(s.id);
                  }}
                  style={[styles.iconBtn, spirits.length === 1 ? { opacity: 0.5 } : null]}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {result && cocktailName.trim() ? (
          <>
            <View style={{ height: 12 }} />
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Results</Text>
              <View style={{ height: 10 }} />
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>Total Volume</Text>
                <Text style={styles.kvVal}>{result.totalVolume.toFixed(2)} ml</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={styles.kvKey}>Pure Alcohol</Text>
                <Text style={styles.kvVal}>{result.totalAlcohol.toFixed(2)} ml</Text>
              </View>
              <View style={[styles.kvRow, { paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)', marginTop: 6 }]}>
                <Text style={[styles.kvVal, { fontSize: 16, fontWeight: '900' }]}>Final ABV</Text>
                <Text style={{ color: '#fbbf24', fontSize: 28, fontWeight: '900' }}>{result.finalABV.toFixed(2)}%</Text>
              </View>
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
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  smallBtnText: { color: '#e6e6e6', fontWeight: '900', fontSize: 12 },
  kvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  kvKey: { color: '#9aa4b2', fontSize: 12 },
  kvVal: { color: '#e6e6e6', fontSize: 12, fontWeight: '800' },
});

