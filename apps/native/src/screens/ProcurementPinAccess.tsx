import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useProcurementWorkspaces } from '../features/ops/procurement/queries';
import { clearProcurementStaffSession, getProcurementStaffSession, setProcurementStaffSession } from '../features/ops/procurement/staffSession';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type StaffRow = {
  id: string;
  full_name: string;
  role: string;
  workspace_id: string;
  permissions: Record<string, boolean> | null;
};

export default function ProcurementPinAccessScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();
  const userId = user?.id;

  const workspaces = useProcurementWorkspaces(userId);

  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [session, setSession] = useState<any>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState('');
  const selectedWorkspace = useMemo(() => (workspaces.data ?? []).find((w) => w.id === workspaceId) ?? null, [workspaces.data, workspaceId]);

  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await getProcurementStaffSession();
      setSession(s);
      setSessionLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!sessionLoaded) return;
    if (pin.length === 4 && workspaceId) submit().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, workspaceId, sessionLoaded]);

  async function submit() {
    if (isSubmitting) return;
    if (!workspaceId) {
      Alert.alert('Select workspace', 'Pick a procurement workspace first.');
      return;
    }
    if (pin.length !== 4) {
      Alert.alert('Invalid PIN', 'Enter a 4-digit PIN.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await supabase
        .from('procurement_staff')
        .select('id, full_name, role, workspace_id, permissions')
        .eq('workspace_id', workspaceId)
        .eq('pin_code', pin)
        .eq('is_active', true)
        .maybeSingle();

      if (res.error || !res.data) {
        setPin('');
        Alert.alert('Invalid PIN', 'Please check your PIN and try again.');
        return;
      }

      const staff = res.data as unknown as StaffRow;
      const wsName = selectedWorkspace?.name ?? (workspaces.data ?? []).find((w) => w.id === staff.workspace_id)?.name ?? 'Procurement';
      const s = {
        staff: {
          id: staff.id,
          full_name: staff.full_name,
          role: staff.role,
          workspace_id: staff.workspace_id,
          permissions: (staff.permissions ?? {}) as Record<string, boolean>,
        },
        workspace: { id: staff.workspace_id, name: wsName },
        createdAt: new Date().toISOString(),
      };
      await setProcurementStaffSession(s);
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
    await clearProcurementStaffSession();
    setSession(null);
    setPin('');
    setWorkspaceId('');
  }

  if (!sessionLoaded) {
    return (
      <View style={styles.root}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  if (session?.staff?.id && session?.workspace?.id) {
    const perms: Record<string, boolean> = session.staff.permissions ?? {};
    const canPO = perms.can_create_po !== false; // default true in DB
    const canReceive = perms.can_receive !== false;

    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              Procurement (Staff)
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {session.staff.full_name} • {session.workspace.name}
            </Text>
          </View>
          <Pressable onPress={() => logout().catch(() => {})} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Logout</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 10 }}>
          <Text style={styles.sectionTitle}>Choose an action</Text>

          <Pressable
            style={[styles.card, !canPO && { opacity: 0.5 }]}
            disabled={!canPO}
            onPress={() => navigation.navigate('PurchaseOrders', { staffMode: true, workspaceId: session.workspace.id, workspaceName: session.workspace.name })}
          >
            <Text style={styles.cardTitle}>Purchase Orders</Text>
            <Text style={styles.cardSub}>Create and manage POs</Text>
          </Pressable>

          <Pressable
            style={[styles.card, !canReceive && { opacity: 0.5 }]}
            disabled={!canReceive}
            onPress={() => navigation.navigate('POReceivedItems', { staffMode: true, workspaceId: session.workspace.id, workspaceName: session.workspace.name })}
          >
            <Text style={styles.cardTitle}>Receiving</Text>
            <Text style={styles.cardSub}>Record deliveries and received docs</Text>
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
            Procurement PIN Access
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Enter a 4-digit staff PIN for a procurement workspace.
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 10 }}>
        {!userId ? (
          <Text style={styles.muted}>Sign in first to use the native app, then use staff PIN if desired.</Text>
        ) : null}

        <Pressable style={styles.picker} onPress={() => setPickerOpen(true)} disabled={!userId}>
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
            editable={!!userId}
          />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <Pressable style={[styles.smallBtn, styles.secondaryBtn]} onPress={() => setPin('')} disabled={isSubmitting || !userId}>
              <Text style={styles.smallBtnText}>Clear</Text>
            </Pressable>
            <Pressable style={[styles.smallBtn, styles.primaryBtn]} onPress={() => submit()} disabled={isSubmitting || !userId}>
              <Text style={styles.smallBtnText}>{isSubmitting ? 'Checking…' : 'Continue'}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Select workspace</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {workspaces.isLoading ? (
                <Text style={styles.muted}>Loading…</Text>
              ) : (workspaces.data ?? []).length === 0 ? (
                <Text style={styles.muted}>No workspaces found.</Text>
              ) : (
                (workspaces.data ?? []).map((w) => (
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
                    <Text style={{ color: '#9aa4b2', marginTop: 2, fontSize: 12 }} numberOfLines={2}>
                      {w.description || '—'}
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
  sectionTitle: { color: '#fff', fontWeight: '900', fontSize: 14, marginBottom: 10 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 14,
    borderRadius: 14,
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

