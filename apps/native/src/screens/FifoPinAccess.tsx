import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFifoWorkspaces } from '../features/ops/workspaces/queries';
import { clearFifoStaffSession, getFifoStaffSession, setFifoStaffSession } from '../features/ops/workspaces/staffSession';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

export default function FifoPinAccessScreen({
  navigation,
  route,
}: {
  navigation: Nav;
  route: any;
}) {
  const { user } = useAuth();
  const userId = user?.id;

  const presetWorkspaceId: string | undefined = route?.params?.workspaceId;

  const workspaces = useFifoWorkspaces(userId);
  const all = workspaces.data ?? [];

  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [session, setSession] = useState<any>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string>(presetWorkspaceId ?? '');
  const selectedWorkspace = useMemo(() => all.find((w) => w.id === workspaceId) ?? null, [all, workspaceId]);

  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await getFifoStaffSession();
      setSession(s);
      setSessionLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!sessionLoaded) return;
    if (presetWorkspaceId && !workspaceId) setWorkspaceId(presetWorkspaceId);
  }, [presetWorkspaceId, sessionLoaded, workspaceId]);

  useEffect(() => {
    if (!sessionLoaded) return;
    if (pin.length === 4) {
      submit().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, sessionLoaded, workspaceId]);

  async function submit() {
    if (isSubmitting) return;
    if (!workspaceId) {
      Alert.alert('Pick a workspace', 'Select a FIFO workspace first.');
      return;
    }
    if (pin.length !== 4) {
      Alert.alert('Invalid PIN', 'Enter a 4-digit PIN.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await (supabase as any).rpc('verify_workspace_member_pin', {
        p_workspace_id: workspaceId,
        p_pin_code: pin,
      });
      if (res.error || !res.data || res.data.length === 0) {
        setPin('');
        Alert.alert('Invalid PIN', 'Please check your PIN and try again.');
        return;
      }

      const row = res.data[0];
      const wsName = selectedWorkspace?.name ?? row.workspace_name ?? 'FIFO workspace';
      const s = {
        member: {
          id: row.id,
          user_id: row.user_id,
          role: row.role,
          workspace_id: row.workspace_id,
        },
        workspace: { id: workspaceId, name: wsName },
        name: row.member_name ?? 'Team member',
        createdAt: new Date().toISOString(),
      };
      await setFifoStaffSession(s);
      setSession(s);
      setPin('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to verify PIN.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function logout() {
    await clearFifoStaffSession();
    setSession(null);
    setPin('');
  }

  if (!sessionLoaded) {
    return (
      <View style={styles.root}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  // Action selection after PIN verification
  if (session?.workspace?.id) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              FIFO Manager
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              Welcome, {session.name} • {session.workspace.name}
            </Text>
          </View>
          <Pressable onPress={() => logout().catch(() => {})} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Logout</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
          <Text style={styles.sectionTitle}>Choose an action</Text>

          <Pressable
            style={[styles.card, { borderColor: 'rgba(244,63,94,0.35)' }]}
            onPress={() => navigation.navigate('InventoryManager', { workspaceId: session.workspace.id, staffSession: true })}
          >
            <Text style={styles.cardTitle}>Inventory</Text>
            <Text style={styles.cardSub}>Record & manage FIFO items (native)</Text>
          </Pressable>

          <Pressable
            style={[styles.card, { borderColor: 'rgba(34,197,94,0.30)' }]}
            onPress={() => navigation.navigate('FifoActivityLog', { workspaceId: session.workspace.id, title: session.workspace.name })}
          >
            <Text style={styles.cardTitle}>Activity Log</Text>
            <Text style={styles.cardSub}>View FIFO workspace activity</Text>
          </Pressable>
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
            FIFO PIN Access
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Enter a 4-digit staff PIN for a FIFO workspace.
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 10 }}>
        <Pressable style={styles.picker} onPress={() => setPickerOpen(true)}>
          <Text style={{ color: '#9aa4b2', fontSize: 12 }}>Workspace</Text>
          <Text style={{ color: '#fff', fontWeight: '900', marginTop: 4 }} numberOfLines={1}>
            {selectedWorkspace?.name ?? (workspaceId ? workspaceId : 'Select…')}
          </Text>
        </Pressable>

        <View style={styles.picker}>
          <Text style={{ color: '#9aa4b2', fontSize: 12 }}>PIN</Text>
          <TextInput
            value={pin}
            onChangeText={(t) => setPin(t.replace(/[^\d]/g, '').slice(0, 4))}
            keyboardType="number-pad"
            placeholder="••••"
            placeholderTextColor="#6b7280"
            secureTextEntry
            style={styles.pinInput}
          />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <Pressable style={[styles.smallBtn, styles.secondaryBtn]} onPress={() => setPin('')} disabled={isSubmitting}>
              <Text style={styles.smallBtnText}>Clear</Text>
            </Pressable>
            <Pressable style={[styles.smallBtn, styles.primaryBtn]} onPress={() => submit()} disabled={isSubmitting}>
              <Text style={styles.smallBtnText}>{isSubmitting ? 'Checking…' : 'Continue'}</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.note}>
          This uses the Supabase RPC `verify_workspace_member_pin` (works for staff PIN access). If you need QR scanning / access
          requests / approvals, those are next to port.
        </Text>
      </ScrollView>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Select workspace</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {workspaces.isLoading ? (
                <Text style={styles.muted}>Loading…</Text>
              ) : all.length === 0 ? (
                <Text style={styles.muted}>No FIFO workspaces found.</Text>
              ) : (
                all.map((w) => (
                  <Pressable
                    key={w.id}
                    style={[styles.modalRow, w.id === workspaceId && { borderColor: 'rgba(59,130,246,0.55)' }]}
                    onPress={() => {
                      setWorkspaceId(w.id);
                      setPickerOpen(false);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                      {w.name}
                    </Text>
                    <Text style={{ color: '#9aa4b2', marginTop: 2, fontSize: 12 }} numberOfLines={1}>
                      {w.member_count ?? 0} members • {w.store_count ?? 0} stores
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Pressable style={[styles.smallBtn, styles.secondaryBtn]} onPress={() => setPickerOpen(false)}>
                <Text style={styles.smallBtnText}>Close</Text>
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
  headerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  headerBtnText: { color: '#fff', fontWeight: '800' },
  muted: { color: '#9aa4b2', padding: 12 },
  picker: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  pinInput: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
    fontWeight: '900',
    letterSpacing: 8,
  },
  smallBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    flex: 1,
    alignItems: 'center',
  },
  primaryBtn: { backgroundColor: 'rgba(59,130,246,0.35)', borderColor: 'rgba(59,130,246,0.55)' },
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' },
  smallBtnText: { color: '#fff', fontWeight: '800' },
  note: { color: '#9aa4b2', fontSize: 12, lineHeight: 18 },
  sectionTitle: { color: '#fff', fontWeight: '900', fontSize: 14, marginBottom: 10 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  cardTitle: { color: '#fff', fontWeight: '900', fontSize: 15 },
  cardSub: { color: '#9aa4b2', marginTop: 4, fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.60)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
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
  modalRow: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 8,
  },
});

