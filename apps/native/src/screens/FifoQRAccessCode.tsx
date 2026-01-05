import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { env } from '../lib/env';
import { supabase } from '../lib/supabase';
import { useFifoWorkspaces } from '../features/ops/workspaces/queries';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type QrRow = { id: string; workspace_id: string; qr_type: string; created_at: string | null };

async function ensureWorkspaceQr(workspaceId: string, userId: string): Promise<QrRow | null> {
  // Prefer an existing QR row (latest); create if none exists.
  const existing = await supabase
    .from('qr_codes')
    .select('id, workspace_id, qr_type, created_at')
    .eq('workspace_id', workspaceId)
    .eq('qr_type', 'fifo_workspace_access')
    .order('created_at', { ascending: false })
    .limit(1);
  if (existing.error) throw existing.error;
  if (existing.data?.[0]) return existing.data[0] as any;

  const created = await supabase
    .from('qr_codes')
    .insert({ workspace_id: workspaceId, qr_type: 'fifo_workspace_access', created_by: userId } as any)
    .select('id, workspace_id, qr_type, created_at')
    .single();
  if (created.error) throw created.error;
  return (created.data ?? null) as any;
}

export default function FifoQRAccessCodeScreen({
  navigation,
  route,
}: {
  navigation: Nav;
  route?: any;
}) {
  const { user } = useAuth();
  const userId = user?.id;

  const presetWorkspaceId: string | undefined = route?.params?.workspaceId;
  const workspaces = useFifoWorkspaces(userId);

  const owned = useMemo(() => (workspaces.data ?? []).filter((w) => w.owner_id === userId), [workspaces.data, userId]);
  const [workspaceId, setWorkspaceId] = useState<string>(presetWorkspaceId ?? '');
  const [qrRow, setQrRow] = useState<QrRow | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(() => owned.find((w) => w.id === workspaceId) ?? null, [owned, workspaceId]);
  const joinLink = useMemo(() => {
    const base = env.webBaseUrl?.trim();
    if (!base || !workspaceId) return '';
    // Match web behavior: QR encodes request link with workspace query param.
    return `${base.replace(/\/$/, '')}/fifo-request-access?workspace=${workspaceId}`;
  }, [workspaceId]);

  async function onSelectWorkspace(id: string) {
    setWorkspaceId(id);
    setQrRow(null);
    if (!userId) return;
    setBusy(true);
    try {
      const row = await ensureWorkspaceQr(id, userId);
      setQrRow(row);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to fetch/create QR.');
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!joinLink) return;
    await Clipboard.setStringAsync(joinLink);
    Alert.alert('Copied', 'Join link copied to clipboard.');
  }

  async function shareLink() {
    if (!joinLink) return;
    try {
      await Share.share({
        title: 'Join FIFO Workspace',
        message: `Scan or open this link to request access: ${joinLink}`,
        url: joinLink,
      });
    } catch {
      // ignore
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
            FIFO QR Access
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Generate a QR code for others to request access.
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96, gap: 10 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Select owned workspace</Text>
          {workspaces.isLoading ? <Text style={styles.muted}>Loading…</Text> : null}
          {owned.length === 0 && !workspaces.isLoading ? <Text style={styles.muted}>No FIFO workspaces owned by this account.</Text> : null}

          <View style={{ gap: 8, marginTop: 8 }}>
            {owned.map((w) => (
              <Pressable
                key={w.id}
                style={[styles.wsRow, w.id === workspaceId && { borderColor: 'rgba(59,130,246,0.55)' }]}
                onPress={() => onSelectWorkspace(w.id)}
                disabled={busy}
              >
                <Text style={{ color: '#fff', fontWeight: '900' }} numberOfLines={1}>
                  {w.name}
                </Text>
                <Text style={{ color: '#9aa4b2', marginTop: 2, fontSize: 12 }} numberOfLines={1}>
                  {w.member_count ?? 0} members • {w.store_count ?? 0} stores
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {workspaceId ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>QR code</Text>
            {!env.webBaseUrl ? (
              <Text style={styles.muted}>
                Missing `EXPO_PUBLIC_WEB_BASE_URL`. Add it to `apps/native/.env` so the QR encodes a valid join URL.
              </Text>
            ) : null}

            <View style={{ marginTop: 10, alignItems: 'center' }}>
              {joinLink ? (
                <View style={styles.qrBox}>
                  <QRCode value={joinLink} size={220} />
                </View>
              ) : (
                <Text style={styles.muted}>Select a workspace to generate.</Text>
              )}
            </View>

            <Text style={styles.muted} numberOfLines={2}>
              {selected?.name ?? 'Workspace'} • {joinLink || '—'}
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable style={[styles.smallBtn, styles.secondaryBtn]} onPress={() => copyLink()} disabled={!joinLink}>
                <Text style={styles.smallBtnText}>Copy link</Text>
              </Pressable>
              <Pressable style={[styles.smallBtn, styles.secondaryBtn]} onPress={() => shareLink()} disabled={!joinLink}>
                <Text style={styles.smallBtnText}>Share</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <Pressable
                style={[styles.smallBtn, styles.primaryBtn]}
                onPress={() => navigation.navigate('FifoScanAccess', { workspaceId })}
                disabled={!workspaceId}
              >
                <Text style={styles.smallBtnText}>Test join flow</Text>
              </Pressable>
              <Pressable
                style={[styles.smallBtn, styles.secondaryBtn]}
                onPress={() => navigation.navigate('FifoQrScanner')}
              >
                <Text style={styles.smallBtnText}>Scan (camera)</Text>
              </Pressable>
              <Pressable
                style={[styles.smallBtn, styles.secondaryBtn]}
                onPress={() => {
                  if (!workspaceId) return;
                  Alert.alert('Created QR record', qrRow?.id ? `qr_codes.id = ${qrRow.id}` : 'No record yet.');
                }}
                disabled={!workspaceId}
              >
                <Text style={styles.smallBtnText}>QR record</Text>
              </Pressable>
            </View>
          </View>
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
  sectionTitle: { color: '#fff', fontWeight: '900' },
  muted: { color: '#9aa4b2', marginTop: 8, fontSize: 12 },
  wsRow: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  qrBox: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
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
  smallBtnText: { color: '#fff', fontWeight: '900' },
});

