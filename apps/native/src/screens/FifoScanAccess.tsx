import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

async function safeGetFifoWorkspace(workspaceId: string) {
  const withType = await supabase
    .from('workspaces')
    .select('id, name, description')
    .eq('id', workspaceId)
    .eq('workspace_type', 'fifo')
    .maybeSingle();
  if (!withType.error && withType.data) return withType.data;

  const withoutType = await supabase.from('workspaces').select('id, name, description').eq('id', workspaceId).maybeSingle();
  if (withoutType.error) throw withoutType.error;
  return withoutType.data;
}

export default function FifoScanAccessScreen({
  navigation,
  route,
}: {
  navigation: Nav;
  route: any;
}) {
  const { user } = useAuth();
  const [qrCodeId, setQrCodeId] = useState<string>(route?.params?.qrCodeId ?? '');
  const [workspaceId, setWorkspaceId] = useState<string>(route?.params?.workspaceId ?? '');

  const [loading, setLoading] = useState(false);
  const [workspace, setWorkspace] = useState<any>(null);
  const [resolvedQrWorkspaceId, setResolvedQrWorkspaceId] = useState<string>('');

  const resolvedWorkspaceId = useMemo(() => workspaceId || resolvedQrWorkspaceId, [workspaceId, resolvedQrWorkspaceId]);
  const requestQrCodeId = useMemo(() => (qrCodeId ? qrCodeId : resolvedWorkspaceId), [qrCodeId, resolvedWorkspaceId]);

  useEffect(() => {
    if (route?.params?.qrCodeId && !qrCodeId) setQrCodeId(route.params.qrCodeId);
    if (route?.params?.workspaceId && !workspaceId) setWorkspaceId(route.params.workspaceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resolveTarget() {
    const qrid = qrCodeId.trim();
    const wsid = workspaceId.trim();
    if (!qrid && !wsid) {
      Alert.alert('Missing link', 'Paste a QR code ID or a workspace ID.');
      return;
    }

    setLoading(true);
    setWorkspace(null);
    setResolvedQrWorkspaceId('');
    try {
      if (wsid) {
        const ws = await safeGetFifoWorkspace(wsid);
        if (!ws) {
          Alert.alert('Not found', 'Workspace not found.');
          return;
        }
        setWorkspace(ws);
        return;
      }

      // QR lookup (public read)
      const qrRes = await supabase
        .from('qr_codes')
        .select('id, workspace_id, qr_type')
        .eq('id', qrid)
        .eq('qr_type', 'fifo_workspace_access')
        .maybeSingle();
      if (qrRes.error) throw qrRes.error;
      if (!qrRes.data?.workspace_id) {
        Alert.alert('Invalid code', 'QR code not found or expired.');
        return;
      }
      setResolvedQrWorkspaceId(qrRes.data.workspace_id);

      const ws = await safeGetFifoWorkspace(qrRes.data.workspace_id);
      if (!ws) {
        Alert.alert('Not found', 'Workspace not found.');
        return;
      }
      setWorkspace(ws);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to resolve QR/workspace.');
    } finally {
      setLoading(false);
    }
  }

  async function requestAccess() {
    if (!user?.id) return;
    if (!resolvedWorkspaceId) {
      Alert.alert('Missing workspace', 'Resolve the workspace first.');
      return;
    }
    if (!requestQrCodeId) {
      Alert.alert('Missing QR', 'Missing QR code reference.');
      return;
    }

    try {
      // Already a member?
      const member = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', resolvedWorkspaceId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!member.error && member.data?.id) {
        Alert.alert('Already a member', 'Opening PIN access…');
        navigation.navigate('FifoPinAccess', { workspaceId: resolvedWorkspaceId });
        return;
      }

      // Pending request exists?
      const existing = await supabase
        .from('access_requests')
        .select('id, status')
        .eq('workspace_id', resolvedWorkspaceId)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();
      if (!existing.error && existing.data?.id) {
        Alert.alert('Request already sent', 'You already have a pending access request.');
        return;
      }

      const ins = await supabase.from('access_requests').insert({
        qr_code_id: requestQrCodeId,
        workspace_id: resolvedWorkspaceId,
        user_id: user.id,
        user_email: user.email ?? null,
        status: 'pending',
      } as any);
      if (ins.error) throw ins.error;
      Alert.alert('Request sent', 'Waiting for approval from the workspace owner.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to submit request.');
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
            Join FIFO workspace
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Paste a QR code ID (or workspace ID), then request access.
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 10 }}>
        <View style={styles.card}>
          <Text style={styles.label}>QR code ID</Text>
          <TextInput
            value={qrCodeId}
            onChangeText={setQrCodeId}
            placeholder="UUID from QR"
            placeholderTextColor="#6b7280"
            autoCapitalize="none"
            style={styles.input}
          />
          <Text style={[styles.label, { marginTop: 10 }]}>Workspace ID (optional fallback)</Text>
          <TextInput
            value={workspaceId}
            onChangeText={setWorkspaceId}
            placeholder="Workspace UUID"
            placeholderTextColor="#6b7280"
            autoCapitalize="none"
            style={styles.input}
          />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Pressable style={[styles.smallBtn, styles.secondaryBtn]} onPress={() => resolveTarget()} disabled={loading}>
              <Text style={styles.smallBtnText}>{loading ? 'Resolving…' : 'Resolve'}</Text>
            </Pressable>
            <Pressable style={[styles.smallBtn, styles.primaryBtn]} onPress={() => requestAccess()} disabled={!user?.id || !workspace || loading}>
              <Text style={styles.smallBtnText}>Request access</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Target</Text>
          {!workspace ? (
            <Text style={styles.muted}>Not resolved yet.</Text>
          ) : (
            <>
              <Text style={styles.wsName}>{workspace.name}</Text>
              <Text style={styles.wsDesc}>{workspace.description || '—'}</Text>
              <Text style={styles.muted}>Workspace: {workspace.id}</Text>
            </>
          )}
        </View>

        <Text style={styles.note}>
          Camera QR scanning is next (device feature). This step ports the actual “resolve + request access” logic natively and keeps the
          workflow unblocked.
        </Text>
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
  label: { color: '#9aa4b2', fontSize: 12 },
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
  sectionTitle: { color: '#fff', fontWeight: '900', marginBottom: 8 },
  wsName: { color: '#fff', fontWeight: '900', fontSize: 16 },
  wsDesc: { color: '#9aa4b2', marginTop: 4 },
  muted: { color: '#9aa4b2', marginTop: 8, fontSize: 12 },
  note: { color: '#9aa4b2', fontSize: 12, lineHeight: 18 },
});

