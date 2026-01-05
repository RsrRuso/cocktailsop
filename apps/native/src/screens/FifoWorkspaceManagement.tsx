import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useCreateFifoWorkspace } from '../features/ops/workspaces/mutations';
import { useFifoWorkspaces } from '../features/ops/workspaces/queries';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

export default function FifoWorkspaceManagementScreen({ navigation }: { navigation: Nav }) {
  const { user } = useAuth();
  const userId = user?.id;

  const { data, isLoading, refetch } = useFifoWorkspaces(userId);
  const createWs = useCreateFifoWorkspace();

  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const all = data ?? [];
    if (!query) return all;
    return all.filter((w) => {
      return (
        w.name.toLowerCase().includes(query) ||
        (w.description ?? '').toLowerCase().includes(query) ||
        (w.workspace_type ?? '').toLowerCase().includes(query)
      );
    });
  }, [data, q]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.title}>FIFO Workspaces</Text>
          <Pressable style={styles.headerBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.headerBtnText}>+ Create</Text>
          </Pressable>
        </View>
        <Text style={styles.sub}>Manage FIFO inventory workspaces. Unported flows open in WebView.</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search workspaces…"
          placeholderTextColor="#6b7280"
          style={styles.search}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        {isLoading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : filtered.length === 0 ? (
          <Text style={styles.muted}>No workspaces yet.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.map((w) => (
              <View key={w.id} style={styles.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {w.name}
                    </Text>
                    <Text style={styles.cardSub} numberOfLines={2}>
                      {w.description || '—'}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {w.member_count ?? 0} members • {w.store_count ?? 0} stores
                    </Text>
                  </View>
                  <Text style={styles.chev}>›</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <Pressable
                    style={[styles.smallBtn, styles.primaryBtn]}
                    onPress={() => navigation.navigate('FifoActivityLog', { workspaceId: w.id, title: w.name })}
                  >
                    <Text style={styles.smallBtnText}>Activity</Text>
                  </Pressable>
                  {w.owner_id === userId ? (
                    <Pressable
                      style={[styles.smallBtn, styles.secondaryBtn]}
                      onPress={() => navigation.navigate('FifoAccessApproval', { workspaceId: w.id })}
                    >
                      <Text style={styles.smallBtnText}>Approvals</Text>
                    </Pressable>
                  ) : null}
                  {w.owner_id === userId ? (
                    <Pressable
                      style={[styles.smallBtn, styles.secondaryBtn]}
                      onPress={() => navigation.navigate('FifoQRAccessCode', { workspaceId: w.id })}
                    >
                      <Text style={styles.smallBtnText}>QR code</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={[styles.smallBtn, styles.secondaryBtn]}
                    onPress={() =>
                      navigation.navigate('FifoPinAccess', {
                        workspaceId: w.id,
                      })
                    }
                  >
                    <Text style={styles.smallBtnText}>PIN access</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <Pressable style={[styles.smallBtn, styles.secondaryBtn, { marginTop: 14 }]} onPress={() => refetch()}>
          <Text style={styles.smallBtnText}>Refresh</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={showCreate} transparent animationType="fade" onRequestClose={() => setShowCreate(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Create FIFO workspace</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Workspace name"
              placeholderTextColor="#6b7280"
              style={styles.input}
            />
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder="Description (optional)"
              placeholderTextColor="#6b7280"
              style={[styles.input, { height: 88 }]}
              multiline
            />

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <Pressable
                style={[styles.smallBtn, styles.secondaryBtn]}
                onPress={() => {
                  setShowCreate(false);
                  setName('');
                  setDesc('');
                }}
                disabled={createWs.isPending}
              >
                <Text style={styles.smallBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.smallBtn, styles.primaryBtn]}
                onPress={async () => {
                  if (!userId) return;
                  try {
                    await createWs.mutateAsync({ ownerId: userId, name, description: desc });
                    setShowCreate(false);
                    setName('');
                    setDesc('');
                  } catch {
                    // Ignore: screen is intentionally minimal; Supabase errors surface via dev console.
                  }
                }}
                disabled={createWs.isPending || !userId}
              >
                <Text style={styles.smallBtnText}>{createWs.isPending ? 'Creating…' : 'Create'}</Text>
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
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  sub: { color: '#9aa4b2', marginTop: 4, fontSize: 12 },
  headerBtn: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  headerBtnText: { color: '#fff', fontWeight: '700' },
  search: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  muted: { color: '#9aa4b2', padding: 12 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  cardTitle: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cardSub: { color: '#9aa4b2', marginTop: 4, fontSize: 12 },
  cardMeta: { color: '#9aa4b2', marginTop: 6, fontSize: 12 },
  chev: { color: '#9aa4b2', fontSize: 22, marginLeft: 6 },
  smallBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  primaryBtn: { backgroundColor: 'rgba(59,130,246,0.35)', borderColor: 'rgba(59,130,246,0.55)' },
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' },
  smallBtnText: { color: '#fff', fontWeight: '700' },
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
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});

