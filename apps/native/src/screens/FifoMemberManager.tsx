import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useFifoWorkspaces } from '../features/ops/workspaces/queries';

type Nav = { goBack: () => void };

type ProfileLite = { id: string; username: string | null; full_name: string | null; avatar_url: string | null };
type MemberRow = { id: string; user_id: string; role: string; pin_code: string | null; displayName: string };

async function fetchMembers(workspaceId: string): Promise<MemberRow[]> {
  const membersRes = await supabase
    .from('workspace_members')
    .select('id, user_id, role, pin_code')
    .eq('workspace_id', workspaceId);
  if (membersRes.error) throw membersRes.error;
  const members = membersRes.data ?? [];

  const userIds = members.map((m: any) => m.user_id).filter(Boolean);
  let profiles: ProfileLite[] = [];
  if (userIds.length > 0) {
    const profRes = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', userIds);
    if (profRes.error) throw profRes.error;
    profiles = (profRes.data ?? []) as any;
  }
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return members.map((m: any) => {
    const p = byId.get(m.user_id);
    const displayName = p?.full_name || (p?.username ? `@${p.username}` : '') || m.user_id;
    return { ...m, displayName } as MemberRow;
  });
}

async function fetchConnections(userId: string, workspaceId: string): Promise<ProfileLite[]> {
  const existingMembers = await supabase.from('workspace_members').select('user_id').eq('workspace_id', workspaceId);
  if (existingMembers.error) throw existingMembers.error;
  const existingIds = new Set((existingMembers.data ?? []).map((m: any) => m.user_id));

  const followersRes = await supabase
    .from('follows')
    .select('follower_id, profiles!follows_follower_id_fkey(id, username, full_name, avatar_url)')
    .eq('following_id', userId);
  if (followersRes.error) throw followersRes.error;
  const followers = (followersRes.data ?? []).map((r: any) => r.profiles).filter(Boolean);

  const followingRes = await supabase
    .from('follows')
    .select('following_id, profiles!follows_following_id_fkey(id, username, full_name, avatar_url)')
    .eq('follower_id', userId);
  if (followingRes.error) throw followingRes.error;
  const following = (followingRes.data ?? []).map((r: any) => r.profiles).filter(Boolean);

  // Merge + de-dupe + filter existing
  const merged: ProfileLite[] = [];
  const seen = new Set<string>();
  for (const p of [...followers, ...following]) {
    if (!p?.id) continue;
    if (existingIds.has(p.id)) continue;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
  }
  merged.sort((a, b) => (a.username ?? '').localeCompare(b.username ?? ''));
  return merged;
}

function genPin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export default function FifoMemberManagerScreen({
  navigation,
  route,
}: {
  navigation: Nav;
  route?: any;
}) {
  const { user } = useAuth();
  const userId = user?.id;

  const { data: workspaces } = useFifoWorkspaces(userId);
  const owned = useMemo(() => (workspaces ?? []).filter((w) => w.owner_id === userId), [workspaces, userId]);

  const [workspaceId, setWorkspaceId] = useState<string>(route?.params?.workspaceId ?? '');
  const selectedWs = useMemo(() => owned.find((w) => w.id === workspaceId) ?? null, [owned, workspaceId]);

  const [tab, setTab] = useState<'members' | 'invite'>('members');

  const members = useQuery({
    queryKey: ['ops', 'fifoMembers', workspaceId],
    enabled: !!workspaceId,
    queryFn: () => fetchMembers(workspaceId),
  });

  const connections = useQuery({
    queryKey: ['ops', 'fifoInviteConnections', userId, workspaceId],
    enabled: !!userId && !!workspaceId,
    queryFn: () => fetchConnections(userId!, workspaceId),
  });

  const [showPin, setShowPin] = useState<Record<string, boolean>>({});
  const [pinModal, setPinModal] = useState<{ open: boolean; member?: MemberRow }>({ open: false });
  const [pinValue, setPinValue] = useState('');

  const savePin = useMutation({
    mutationFn: async ({ memberId, memberUserId, newPin }: { memberId: string; memberUserId: string; newPin: string }) => {
      if (newPin && (newPin.length < 4 || !/^\d+$/.test(newPin))) throw new Error('PIN must be 4+ digits');
      const upd = await supabase.from('workspace_members').update({ pin_code: newPin || null }).eq('id', memberId);
      if (upd.error) throw upd.error;

      if (newPin) {
        // Best-effort: notify member via edge function (same as web).
        try {
          await supabase.functions.invoke('send-pin-notification', {
            body: { userId: memberUserId, pin: newPin, workspaceName: selectedWs?.name ?? 'FIFO workspace', workspaceType: 'fifo' },
          });
        } catch {
          // ignore
        }
      }
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ops', 'fifoMembers', workspaceId] });
      await members.refetch();
    },
  });

  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const filteredConnections = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = connections.data ?? [];
    if (!query) return list;
    return list.filter((p) => {
      return (
        (p.username ?? '').toLowerCase().includes(query) ||
        (p.full_name ?? '').toLowerCase().includes(query)
      );
    });
  }, [connections.data, q]);

  const addMembers = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Not signed in');
      if (!workspaceId) throw new Error('Select a workspace');

      const ids = Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (ids.length === 0) throw new Error('Select at least one user');

      const rows = ids.map((uid) => ({
        workspace_id: workspaceId,
        user_id: uid,
        role,
        permissions: {
          can_receive: true,
          can_transfer: true,
          can_manage: role === 'admin',
          can_delete: role === 'admin',
        },
        invited_by: userId,
      }));

      const ins = await supabase.from('workspace_members').insert(rows as any);
      if (ins.error) throw ins.error;
      return true;
    },
    onSuccess: async () => {
      setSelected({});
      await queryClient.invalidateQueries({ queryKey: ['ops', 'fifoMembers', workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ['ops', 'fifoInviteConnections', userId, workspaceId] });
      await members.refetch();
      await connections.refetch();
      setTab('members');
    },
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            FIFO Members & PINs
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {selectedWs?.name ?? 'Select a FIFO workspace you own'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 10 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Workspace</Text>
          {owned.length === 0 ? <Text style={styles.muted}>No owned FIFO workspaces found.</Text> : null}
          <View style={{ gap: 8, marginTop: 8 }}>
            {owned.map((w) => (
              <Pressable
                key={w.id}
                style={[styles.wsRow, w.id === workspaceId && { borderColor: 'rgba(59,130,246,0.55)' }]}
                onPress={() => {
                  setWorkspaceId(w.id);
                  setSelected({});
                  setQ('');
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                  {w.name}
                </Text>
                <Text style={{ color: '#9aa4b2', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {w.member_count ?? 0} members • {w.store_count ?? 0} stores
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {!workspaceId ? null : (
          <>
            <View style={styles.tabs}>
              {(['members', 'invite'] as const).map((t) => (
                <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                  <Text style={styles.tabText}>{t.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>

            {tab === 'members' ? (
              <View style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.sectionTitle}>Members</Text>
                  <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => members.refetch()} disabled={members.isFetching}>
                    <Text style={styles.btnText}>{members.isFetching ? '…' : 'Refresh'}</Text>
                  </Pressable>
                </View>
                {members.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
                {(members.data ?? []).length === 0 && !members.isLoading ? (
                  <Text style={styles.muted}>No members yet. Add members from Invite tab.</Text>
                ) : null}
                <View style={{ gap: 10, marginTop: 10 }}>
                  {(members.data ?? []).map((m) => (
                    <View key={m.id} style={styles.memberRow}>
                      <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                        {m.displayName}
                      </Text>
                      <Text style={{ color: '#9aa4b2', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                        {m.role.toUpperCase()} • PIN:{' '}
                        {m.pin_code ? (showPin[m.id] ? m.pin_code : '••••') : 'none'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                        <Pressable
                          style={[styles.btn, styles.secondaryBtn]}
                          onPress={() => setShowPin((s) => ({ ...s, [m.id]: !s[m.id] }))}
                          disabled={!m.pin_code}
                        >
                          <Text style={styles.btnText}>{showPin[m.id] ? 'Hide' : 'Show'}</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.btn, styles.primaryBtn]}
                          onPress={() => {
                            setPinValue(m.pin_code ?? '');
                            setPinModal({ open: true, member: m });
                          }}
                        >
                          <Text style={styles.btnText}>{m.pin_code ? 'Edit PIN' : 'Set PIN'}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {tab === 'invite' ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Invite connections</Text>
                <Text style={styles.muted}>
                  Adds selected people directly to `workspace_members` (same as web invite). They can then use PIN access once you set a PIN.
                </Text>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <Pressable style={[styles.btn, role === 'member' ? styles.primaryBtn : styles.secondaryBtn]} onPress={() => setRole('member')}>
                    <Text style={styles.btnText}>Member</Text>
                  </Pressable>
                  <Pressable style={[styles.btn, role === 'admin' ? styles.primaryBtn : styles.secondaryBtn]} onPress={() => setRole('admin')}>
                    <Text style={styles.btnText}>Admin</Text>
                  </Pressable>
                </View>

                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Search followers/following…"
                  placeholderTextColor="#6b7280"
                  style={styles.search}
                />

                {connections.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
                <View style={{ gap: 8, marginTop: 10 }}>
                  {filteredConnections.map((p) => {
                    const name = p.full_name || (p.username ? `@${p.username}` : '') || p.id;
                    const checked = Boolean(selected[p.id]);
                    return (
                      <Pressable
                        key={p.id}
                        style={[styles.profileRow, checked && { borderColor: 'rgba(59,130,246,0.55)' }]}
                        onPress={() => setSelected((s) => ({ ...s, [p.id]: !checked }))}
                      >
                        <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                          {name}
                        </Text>
                        <Text style={{ color: '#9aa4b2', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                          {checked ? 'Selected' : 'Tap to select'}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {filteredConnections.length === 0 && !connections.isLoading ? <Text style={styles.muted}>No connections available.</Text> : null}
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <Pressable
                    style={[styles.btn, styles.secondaryBtn]}
                    onPress={() => {
                      setSelected({});
                      setQ('');
                    }}
                  >
                    <Text style={styles.btnText}>Clear</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.btn, styles.primaryBtn]}
                    onPress={() => {
                      const count = Object.values(selected).filter(Boolean).length;
                      if (count === 0) {
                        Alert.alert('Select users', 'Pick at least one person to add.');
                        return;
                      }
                      Alert.alert('Add members?', `${count} user(s) will be added as ${role}.`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Add', style: 'default', onPress: () => addMembers.mutate() },
                      ]);
                    }}
                    disabled={addMembers.isPending}
                  >
                    <Text style={styles.btnText}>{addMembers.isPending ? 'Adding…' : 'Add selected'}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <Modal visible={pinModal.open} transparent animationType="fade" onRequestClose={() => setPinModal({ open: false })}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Set PIN</Text>
            <Text style={styles.muted} numberOfLines={2}>
              {pinModal.member?.displayName ?? 'Member'}
            </Text>
            <TextInput
              value={pinValue}
              onChangeText={(t) => setPinValue(t.replace(/\D/g, '').slice(0, 8))}
              placeholder="4+ digits"
              placeholderTextColor="#6b7280"
              keyboardType="number-pad"
              style={styles.pinInput}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => setPinValue(genPin())}>
                <Text style={styles.btnText}>Random</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.secondaryBtn]}
                onPress={() => setPinValue('')}
                disabled={!pinModal.member?.pin_code}
              >
                <Text style={styles.btnText}>Remove</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => setPinModal({ open: false })}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.primaryBtn]}
                onPress={() => {
                  const m = pinModal.member;
                  if (!m) return;
                  savePin
                    .mutateAsync({ memberId: m.id, memberUserId: m.user_id, newPin: pinValue })
                    .then(() => {
                      setPinModal({ open: false });
                      setPinValue('');
                      Alert.alert('Saved', pinValue ? 'PIN updated.' : 'PIN removed.');
                    })
                    .catch((e: any) => Alert.alert('Error', e?.message ?? 'Failed to update PIN'));
                }}
                disabled={savePin.isPending}
              >
                <Text style={styles.btnText}>{savePin.isPending ? 'Saving…' : 'Save'}</Text>
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
  wsRow: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tabs: { flexDirection: 'row', gap: 10 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  tabActive: { borderColor: 'rgba(59,130,246,0.55)', backgroundColor: 'rgba(59,130,246,0.16)' },
  tabText: { color: '#fff', fontWeight: '900', fontSize: 12 },
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
  btnText: { color: '#fff', fontWeight: '900' },
  memberRow: {
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
  profileRow: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
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
  pinInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
    fontWeight: '900',
    letterSpacing: 6,
  },
});

