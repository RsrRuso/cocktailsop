import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useMixologistGroups } from '../features/ops/batch/queries';
import { clearBatchStaffSession, getBatchStaffSession, setBatchStaffSession } from '../features/ops/batch/staffSession';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type VerifyRow = {
  id: string;
  user_id: string;
  role: string;
  group_id: string;
  member_name: string | null;
};

export default function BatchPinAccessScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();
  const userId = user?.id;

  const groupsQ = useMixologistGroups(userId);

  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [session, setSession] = useState<any>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [groupId, setGroupId] = useState('');
  const selectedGroup = useMemo(() => (groupsQ.data ?? []).find((g) => g.id === groupId) ?? null, [groupsQ.data, groupId]);

  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await getBatchStaffSession();
      setSession(s);
      setSessionLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!sessionLoaded) return;
    if (pin.length === 4 && groupId) submit().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, groupId, sessionLoaded]);

  async function submit() {
    if (isSubmitting) return;
    if (!groupId) {
      Alert.alert('Pick a group', 'Select a mixologist group first.');
      return;
    }
    if (pin.length !== 4) {
      Alert.alert('Invalid PIN', 'Enter a 4-digit PIN.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await (supabase as any).rpc('verify_mixologist_group_pin', {
        p_group_id: groupId,
        p_pin_code: pin,
      });
      if (res.error || !res.data || res.data.length === 0) {
        setPin('');
        Alert.alert('Invalid PIN', 'Please check your PIN and try again.');
        return;
      }

      const row = res.data[0] as VerifyRow;
      const gName = selectedGroup?.name ?? (groupsQ.data ?? []).find((g) => g.id === row.group_id)?.name ?? 'Batch group';
      const s = {
        member: { id: row.id, user_id: row.user_id, role: row.role, group_id: row.group_id },
        group: { id: row.group_id, name: gName },
        name: row.member_name ?? 'Team member',
        pin,
        createdAt: new Date().toISOString(),
      };
      await setBatchStaffSession(s);
      setSession(s);
      setPin('');
    } catch (e: any) {
      setPin('');
      Alert.alert('Error', e?.message ?? 'Failed to verify PIN.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function logout() {
    await clearBatchStaffSession();
    setSession(null);
    setPin('');
    setGroupId('');
  }

  if (!sessionLoaded) {
    return (
      <View style={styles.root}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  if (session?.group?.id) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              Batch PIN Access
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {session.name} • {session.group.name}
            </Text>
          </View>
          <Pressable style={[styles.btn, styles.dangerBtn]} onPress={() => logout()}>
            <Text style={styles.btnText}>Logout</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 12 }}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Choose an action</Text>
            <Text style={styles.muted}>This session lets you view group recipes/productions securely.</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable
                style={[styles.btn, styles.primaryBtn, { flex: 1 }]}
                onPress={() =>
                  navigation.navigate('BatchCalculator', {
                    staffSession: session,
                  })
                }
              >
                <Text style={styles.btnText}>Calculator</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.secondaryBtn, { flex: 1 }]}
                onPress={() =>
                  navigation.navigate('BatchCalculator', {
                    staffSession: session,
                  })
                }
              >
                <Text style={styles.btnText}>History</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Batch PIN Access
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Enter a 4-digit group PIN
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 12 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Group</Text>
          <Pressable style={[styles.btn, styles.secondaryBtn, { marginTop: 10 }]} onPress={() => setPickerOpen(true)}>
            <Text style={styles.btnText}>{selectedGroup?.name ?? 'Select group'}</Text>
          </Pressable>
          <Text style={styles.muted}>Only groups you can access are shown.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>PIN</Text>
          <Text style={styles.muted}>Tap digits to enter your PIN.</Text>
          <View style={styles.pinDots}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.dot, pin.length > i ? styles.dotOn : null]} />
            ))}
          </View>
          <View style={styles.pad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '←'].map((k) => (
              <Pressable
                key={k}
                style={[styles.key, k === 'C' ? styles.keyAlt : null, k === '←' ? styles.keyAlt : null]}
                onPress={() => {
                  if (k === 'C') {
                    setPin('');
                    return;
                  }
                  if (k === '←') {
                    setPin((p) => p.slice(0, -1));
                    return;
                  }
                  setPin((p) => (p.length >= 4 ? p : p + k));
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.keyText}>{k}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={[styles.btn, styles.primaryBtn]} onPress={() => submit()} disabled={isSubmitting || pin.length !== 4 || !groupId}>
            <Text style={styles.btnText}>{isSubmitting ? 'Checking…' : 'Verify PIN'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Select group</Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {(groupsQ.data ?? []).map((g) => (
                <Pressable
                  key={g.id}
                  style={[styles.pickRow, groupId === g.id ? styles.pickRowOn : null]}
                  onPress={() => {
                    setGroupId(g.id);
                    setPickerOpen(false);
                  }}
                >
                  <Text style={styles.pickTitle}>{g.name}</Text>
                  {g.description ? <Text style={styles.pickSub}>{g.description}</Text> : null}
                </Pressable>
              ))}
              {!groupsQ.isLoading && (groupsQ.data ?? []).length === 0 ? <Text style={styles.muted}>No groups found.</Text> : null}
            </ScrollView>
            <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => setPickerOpen(false)}>
              <Text style={styles.btnText}>Close</Text>
            </Pressable>
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
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: { backgroundColor: 'rgba(59,130,246,0.35)', borderColor: 'rgba(59,130,246,0.55)' },
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' },
  dangerBtn: { backgroundColor: 'rgba(239,68,68,0.18)', borderColor: 'rgba(239,68,68,0.40)' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  pinDots: { flexDirection: 'row', gap: 10, marginTop: 12, justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)' },
  dotOn: { backgroundColor: 'rgba(59,130,246,0.85)', borderColor: 'rgba(59,130,246,0.85)' },
  pad: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  key: {
    width: '29%',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  keyAlt: { backgroundColor: 'rgba(255,255,255,0.03)' },
  keyText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.60)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#0b1220',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
    gap: 10,
  },
  modalTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  pickRow: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 10,
  },
  pickRowOn: { borderColor: 'rgba(59,130,246,0.55)', backgroundColor: 'rgba(59,130,246,0.18)' },
  pickTitle: { color: '#fff', fontWeight: '900' },
  pickSub: { color: '#9aa4b2', marginTop: 4, fontSize: 12 },
});

