import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useProcurementWorkspaces } from '../features/ops/procurement/queries';
import type { ProcurementStaffLite } from '../features/ops/procurement/types';
import {
  useCreateProcurementStaff,
  useProcurementStaff,
  useProcurementWorkspaceRole,
  useSetProcurementStaffActive,
  useUpdateProcurementStaff,
} from '../features/ops/procurement/staff';

type Nav = { goBack: () => void };

function genPin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function normalizePermissions(p?: Record<string, boolean> | null) {
  return {
    can_create_po: p?.can_create_po !== false,
    can_receive: p?.can_receive !== false,
  };
}

export default function ProcurementStaffManagerScreen({ navigation, route }: { navigation: Nav; route?: any }) {
  const { user } = useAuth();
  const userId = user?.id;

  const workspaces = useProcurementWorkspaces(userId);
  const [workspaceId, setWorkspaceId] = useState<string | null>(route?.params?.workspaceId ?? null);
  const ws = useMemo(() => (workspaces.data ?? []).find((w) => w.id === workspaceId) ?? null, [workspaces.data, workspaceId]);

  const roleQ = useProcurementWorkspaceRole(userId, workspaceId ?? undefined);
  const isAdmin = roleQ.data === 'owner' || roleQ.data === 'admin';

  const staff = useProcurementStaff(workspaceId ?? undefined);
  const setActive = useSetProcurementStaffActive(workspaceId ?? undefined);
  const create = useCreateProcurementStaff(workspaceId ?? undefined);
  const update = useUpdateProcurementStaff(workspaceId ?? undefined);

  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = staff.data ?? [];
    if (!query) return list;
    return list.filter((s) => s.full_name.toLowerCase().includes(query) || (s.role ?? '').toLowerCase().includes(query));
  }, [staff.data, q]);

  const [showPin, setShowPin] = useState<Record<string, boolean>>({});
  const [edit, setEdit] = useState<{ open: boolean; mode: 'create' | 'edit'; staff?: ProcurementStaffLite }>({ open: false, mode: 'create' });

  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'po_staff' | 'receiving_staff' | 'staff'>('staff');
  const [pin, setPin] = useState('');
  const [canCreatePO, setCanCreatePO] = useState(true);
  const [canReceive, setCanReceive] = useState(true);
  const [active, setActiveFlag] = useState(true);

  function openCreate() {
    setEdit({ open: true, mode: 'create' });
    setFullName('');
    setRole('staff');
    setPin(genPin());
    setCanCreatePO(true);
    setCanReceive(true);
    setActiveFlag(true);
  }

  function openEditStaff(s: ProcurementStaffLite) {
    setEdit({ open: true, mode: 'edit', staff: s });
    setFullName(s.full_name);
    setRole((s.role as any) || 'staff');
    setPin(s.pin_code);
    const perms = normalizePermissions(s.permissions);
    setCanCreatePO(perms.can_create_po);
    setCanReceive(perms.can_receive);
    setActiveFlag(Boolean(s.is_active));
  }

  async function save() {
    if (!workspaceId) return;
    const payload = {
      full_name: fullName,
      role,
      pin_code: pin,
      permissions: { can_create_po: canCreatePO, can_receive: canReceive },
      is_active: active,
    };
    try {
      if (edit.mode === 'create') {
        await create.mutateAsync(payload);
      } else {
        if (!edit.staff?.id) throw new Error('Missing staff id');
        await update.mutateAsync({ id: edit.staff.id, ...payload });
      }
      setEdit({ open: false, mode: 'create' });
      Alert.alert('Saved', 'Staff updated.');
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Could not save staff.');
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Procurement Staff & PINs
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {ws ? ws.name : 'Select a procurement workspace'}
            {roleQ.isLoading ? ' • checking role…' : roleQ.data ? ` • ${roleQ.data}` : ''}
          </Text>
        </View>
        <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => staff.refetch()} disabled={!workspaceId || staff.isFetching}>
          <Text style={styles.btnText}>{staff.isFetching ? '…' : 'Refresh'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 10 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Workspace</Text>
          <Text style={styles.muted}>Only admins can edit staff. If you’re not admin, the controls are disabled.</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {(workspaces.data ?? []).map((w) => (
              <Pressable
                key={w.id}
                style={[styles.wsRow, w.id === workspaceId && { borderColor: 'rgba(59,130,246,0.55)' }]}
                onPress={() => {
                  setWorkspaceId(w.id);
                  setQ('');
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                  {w.name}
                </Text>
                <Text style={{ color: '#9aa4b2', fontSize: 12, marginTop: 2 }} numberOfLines={2}>
                  {w.description || '—'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {!workspaceId ? null : (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Staff</Text>
                <Text style={styles.muted}>PIN login uses `procurement_staff`.</Text>
              </View>
              <Pressable style={[styles.btn, styles.primaryBtn]} onPress={() => openCreate()} disabled={!isAdmin}>
                <Text style={styles.btnText}>+ Add</Text>
              </Pressable>
            </View>

            <TextInput value={q} onChangeText={setQ} placeholder="Search staff…" placeholderTextColor="#6b7280" style={styles.search} />

            {!isAdmin ? <Text style={styles.warn}>You are not an admin for this workspace. Editing is disabled.</Text> : null}

            {staff.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
            {filtered.length === 0 && !staff.isLoading ? <Text style={styles.muted}>No staff records.</Text> : null}

            <View style={{ gap: 10, marginTop: 10 }}>
              {filtered.map((s) => {
                const perms = normalizePermissions(s.permissions);
                return (
                  <View key={s.id} style={styles.row}>
                    <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                      {s.full_name} {s.is_active ? '' : '• (inactive)'}
                    </Text>
                    <Text style={{ color: '#9aa4b2', fontSize: 12, marginTop: 2 }} numberOfLines={2}>
                      Role: {s.role} • PIN: {showPin[s.id] ? s.pin_code : '••••'} • PO {perms.can_create_po ? '✓' : '×'} • Receive{' '}
                      {perms.can_receive ? '✓' : '×'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                      <Pressable
                        style={[styles.btn, styles.secondaryBtn]}
                        onPress={() => setShowPin((m) => ({ ...m, [s.id]: !m[s.id] }))}
                      >
                        <Text style={styles.btnText}>{showPin[s.id] ? 'Hide PIN' : 'Show PIN'}</Text>
                      </Pressable>
                      <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => openEditStaff(s)} disabled={!isAdmin}>
                        <Text style={styles.btnText}>Edit</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.btn, styles.secondaryBtn]}
                        onPress={() => {
                          if (!isAdmin) return;
                          Alert.alert(s.is_active ? 'Deactivate staff?' : 'Activate staff?', s.full_name, [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Confirm',
                              style: 'default',
                              onPress: () => setActive.mutate({ id: s.id, is_active: !s.is_active }),
                            },
                          ]);
                        }}
                        disabled={!isAdmin || setActive.isPending}
                      >
                        <Text style={styles.btnText}>{s.is_active ? 'Deactivate' : 'Activate'}</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={edit.open} transparent animationType="fade" onRequestClose={() => setEdit({ open: false, mode: 'create' })}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{edit.mode === 'create' ? 'Add staff' : 'Edit staff'}</Text>
            <Text style={styles.muted} numberOfLines={1}>
              {ws?.name ?? ''}
            </Text>

            <TextInput value={fullName} onChangeText={setFullName} placeholder="Full name" placeholderTextColor="#6b7280" style={styles.input} />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(['staff', 'po_staff', 'receiving_staff', 'admin'] as const).map((r) => (
                <Pressable key={r} style={[styles.btn, role === r ? styles.primaryBtn : styles.secondaryBtn]} onPress={() => setRole(r)}>
                  <Text style={styles.btnText}>{r}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.pinRow}>
              <TextInput
                value={pin}
                onChangeText={(t) => setPin(t.replace(/[^\d]/g, '').slice(0, 4))}
                placeholder="4-digit PIN"
                placeholderTextColor="#6b7280"
                keyboardType="number-pad"
                style={[styles.input, { flex: 1 }]}
              />
              <Pressable style={[styles.btn, styles.secondaryBtn, { flex: 0 }]} onPress={() => setPin(genPin())}>
                <Text style={styles.btnText}>Random</Text>
              </Pressable>
            </View>

            <View style={{ gap: 8 }}>
              <Pressable style={[styles.toggle, canCreatePO && styles.toggleOn]} onPress={() => setCanCreatePO((v) => !v)}>
                <Text style={styles.toggleText}>Can create POs</Text>
                <Text style={styles.toggleText}>{canCreatePO ? '✓' : '×'}</Text>
              </Pressable>
              <Pressable style={[styles.toggle, canReceive && styles.toggleOn]} onPress={() => setCanReceive((v) => !v)}>
                <Text style={styles.toggleText}>Can receive</Text>
                <Text style={styles.toggleText}>{canReceive ? '✓' : '×'}</Text>
              </Pressable>
              <Pressable style={[styles.toggle, active && styles.toggleOn]} onPress={() => setActiveFlag((v) => !v)}>
                <Text style={styles.toggleText}>Active</Text>
                <Text style={styles.toggleText}>{active ? '✓' : '×'}</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => setEdit({ open: false, mode: 'create' })}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.primaryBtn]}
                onPress={() => save()}
                disabled={create.isPending || update.isPending || !isAdmin}
              >
                <Text style={styles.btnText}>{create.isPending || update.isPending ? 'Saving…' : 'Save'}</Text>
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
  muted: { color: '#9aa4b2', marginTop: 6, fontSize: 12, lineHeight: 18 },
  warn: { color: '#f59e0b', marginTop: 10, fontSize: 12 },
  wsRow: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  search: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  row: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  primaryBtn: { backgroundColor: 'rgba(59,130,246,0.35)', borderColor: 'rgba(59,130,246,0.55)' },
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.60)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pinRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  toggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  toggleOn: { borderColor: 'rgba(34,197,94,0.45)', backgroundColor: 'rgba(34,197,94,0.12)' },
  toggleText: { color: '#fff', fontWeight: '800' },
});

