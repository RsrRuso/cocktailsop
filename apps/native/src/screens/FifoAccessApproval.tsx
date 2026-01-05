import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useFifoWorkspaces } from '../features/ops/workspaces/queries';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';

type Nav = { goBack: () => void };

type AccessRequestRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  user_email: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
};

export default function FifoAccessApprovalScreen({
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
  const selectedWorkspace = useMemo(() => owned.find((w) => w.id === workspaceId) ?? null, [owned, workspaceId]);

  const requests = useQuery({
    queryKey: ['ops', 'fifoAccessRequests', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<AccessRequestRow[]> => {
      const res = await supabase
        .from('access_requests')
        .select('id, workspace_id, user_id, user_email, status, approved_by, approved_at, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      if (res.error) throw res.error;
      return (res.data ?? []) as unknown as AccessRequestRow[];
    },
  });

  const approve = useMutation({
    mutationFn: async (req: AccessRequestRow) => {
      if (!userId) throw new Error('Not signed in');
      if (!workspaceId) throw new Error('No workspace selected');

      // Update request status
      const upd = await supabase
        .from('access_requests')
        .update({ status: 'approved', approved_by: userId, approved_at: new Date().toISOString() })
        .eq('id', req.id);
      if (upd.error) throw upd.error;

      // Already member?
      const exists = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', req.user_id)
        .maybeSingle();
      if (!exists.error && exists.data?.id) return true;

      // Add as member (default FIFO permissions)
      const ins = await supabase.from('workspace_members').insert({
        workspace_id: workspaceId,
        user_id: req.user_id,
        role: 'member',
        permissions: { can_receive: true, can_transfer: true, can_manage: false, can_delete: false },
        invited_by: userId,
      } as any);
      if (ins.error) throw ins.error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ops', 'fifoAccessRequests', workspaceId] });
    },
  });

  const reject = useMutation({
    mutationFn: async (req: AccessRequestRow) => {
      if (!userId) throw new Error('Not signed in');
      const upd = await supabase
        .from('access_requests')
        .update({ status: 'rejected', approved_by: userId, approved_at: new Date().toISOString() })
        .eq('id', req.id);
      if (upd.error) throw upd.error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ops', 'fifoAccessRequests', workspaceId] });
    },
  });

  const pending = useMemo(() => (requests.data ?? []).filter((r) => r.status === 'pending'), [requests.data]);
  const processed = useMemo(() => (requests.data ?? []).filter((r) => r.status !== 'pending'), [requests.data]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            FIFO Approvals
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {selectedWorkspace?.name ?? 'Select a FIFO workspace you own'}
          </Text>
        </View>
        <Pressable
          onPress={() => requests.refetch()}
          style={styles.headerBtn}
          disabled={!workspaceId || requests.isFetching}
        >
          <Text style={styles.headerBtnText}>{requests.isFetching ? '…' : 'Refresh'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 10 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Workspace</Text>
          {owned.length === 0 ? (
            <Text style={styles.muted}>No FIFO workspaces owned by this account.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {owned.map((w) => (
                <Pressable
                  key={w.id}
                  style={[styles.wsRow, w.id === workspaceId && { borderColor: 'rgba(59,130,246,0.55)' }]}
                  onPress={() => setWorkspaceId(w.id)}
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
          )}
        </View>

        {!workspaceId ? null : (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Pending ({pending.length})</Text>
              {requests.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
              {pending.length === 0 && !requests.isLoading ? <Text style={styles.muted}>No pending requests.</Text> : null}
              <View style={{ gap: 10, marginTop: 8 }}>
                {pending.map((r) => (
                  <View key={r.id} style={styles.reqRow}>
                    <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                      {r.user_email ?? r.user_id}
                    </Text>
                    <Text style={{ color: '#9aa4b2', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                      Requested {new Date(r.created_at).toLocaleString()}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                      <Pressable
                        style={[styles.smallBtn, styles.primaryBtn]}
                        onPress={() => {
                          Alert.alert('Approve access?', r.user_email ?? r.user_id, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Approve', style: 'default', onPress: () => approve.mutate(r) },
                          ]);
                        }}
                        disabled={approve.isPending || reject.isPending}
                      >
                        <Text style={styles.smallBtnText}>{approve.isPending ? 'Approving…' : 'Approve'}</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.smallBtn, styles.dangerBtn]}
                        onPress={() => {
                          Alert.alert('Reject request?', r.user_email ?? r.user_id, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Reject', style: 'destructive', onPress: () => reject.mutate(r) },
                          ]);
                        }}
                        disabled={approve.isPending || reject.isPending}
                      >
                        <Text style={styles.smallBtnText}>{reject.isPending ? 'Rejecting…' : 'Reject'}</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>History ({processed.length})</Text>
              {processed.length === 0 ? <Text style={styles.muted}>No processed requests yet.</Text> : null}
              <View style={{ gap: 8, marginTop: 8 }}>
                {processed.slice(0, 30).map((r) => (
                  <View key={r.id} style={styles.historyRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontWeight: '800' }} numberOfLines={1}>
                        {r.user_email ?? r.user_id}
                      </Text>
                      <Text style={{ color: '#9aa4b2', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                        {new Date(r.created_at).toLocaleDateString()} • {r.approved_at ? new Date(r.approved_at).toLocaleString() : '—'}
                      </Text>
                    </View>
                    <Text style={{ color: r.status === 'approved' ? '#22c55e' : '#ef4444', fontWeight: '900' }}>
                      {r.status.toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
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
  headerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  headerBtnText: { color: '#fff', fontWeight: '800' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  sectionTitle: { color: '#fff', fontWeight: '900' },
  muted: { color: '#9aa4b2', marginTop: 8, fontSize: 12 },
  wsRow: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  reqRow: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  smallBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    flex: 1,
    alignItems: 'center',
  },
  primaryBtn: { backgroundColor: 'rgba(34,197,94,0.22)', borderColor: 'rgba(34,197,94,0.45)' },
  dangerBtn: { backgroundColor: 'rgba(239,68,68,0.18)', borderColor: 'rgba(239,68,68,0.40)' },
  smallBtnText: { color: '#fff', fontWeight: '900' },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});

