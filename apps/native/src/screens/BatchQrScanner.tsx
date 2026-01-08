import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.trim());
}

function parseBatchQr(raw: string): { qrId?: string; embeddedData?: string } | null {
  const v = raw.trim();
  if (!v) return null;

  // If QR is just a UUID, treat it as batch_qr_codes.id
  if (isUuid(v)) return { qrId: v };

  try {
    const u = new URL(v);
    const d = u.searchParams.get('d') || u.searchParams.get('embeddedData') || undefined;
    const idFromQuery = u.searchParams.get('id') || u.searchParams.get('qrId') || undefined;
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((p) => p === 'batch-qr');
    const idFromPath = idx >= 0 ? parts[idx + 1] : undefined;
    const qrId = idFromPath || idFromQuery || undefined;
    if (!qrId && !d) return null;
    return { qrId, embeddedData: d ?? undefined };
  } catch {
    // If QR contains a non-url string, try extracting an id-like token
    return null;
  }
}

export default function BatchQrScannerScreen({ navigation }: { navigation: Nav }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [manual, setManual] = useState('');

  const canUseCamera = useMemo(() => permission?.granted === true, [permission?.granted]);

  function go(value: string) {
    const parsed = parseBatchQr(value);
    if (!parsed?.qrId && !parsed?.embeddedData) {
      Alert.alert('Unrecognized QR', 'This code is not a Batch QR submission link.');
      return;
    }
    navigation.navigate('BatchQRSubmit', { qrId: parsed.qrId, embeddedData: parsed.embeddedData });
  }

  async function onScan(value: string) {
    if (locked) return;
    setLocked(true);
    go(value);
  }

  if (!permission) {
    return (
      <View style={styles.root}>
        <Text style={styles.muted}>Loading camera…</Text>
      </View>
    );
  }

  if (!canUseCamera) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Scan Batch QR</Text>
            <Text style={styles.sub}>Camera permission required.</Text>
          </View>
        </View>
        <View style={{ padding: 12 }}>
          <Pressable style={[styles.btn, styles.primaryBtn]} onPress={() => requestPermission()}>
            <Text style={styles.btnText}>Enable camera</Text>
          </Pressable>
          <Text style={styles.note}>
            If permission was denied, enable Camera in your device settings for SpecVerse.
          </Text>
          <View style={{ height: 12 }} />
          <Text style={{ color: '#e6e6e6', fontWeight: '900' }}>Manual paste</Text>
          <Text style={styles.note}>Paste a Batch QR URL or QR ID:</Text>
          <TextInput value={manual} onChangeText={setManual} placeholder="https://…/batch-qr/<id>?d=…" placeholderTextColor="#6b7280" style={styles.input} />
          <Pressable style={[styles.btn, styles.secondaryBtn, { marginTop: 10 }]} onPress={() => go(manual)}>
            <Text style={styles.btnText}>Open</Text>
          </Pressable>
        </View>
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
          <Text style={styles.title}>Scan Batch QR</Text>
          <Text style={styles.sub}>Point camera at the QR code.</Text>
        </View>
        <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => setLocked(false)}>
          <Text style={styles.btnText}>Reset</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        <CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={(e) => onScan(e.data)} />
        <View style={styles.overlay}>
          <View style={styles.frame} />
          <Text style={styles.overlayText}>Align QR inside the square</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: {
    paddingTop: 16,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0b1220',
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
  muted: { color: '#9aa4b2', padding: 12 },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  primaryBtn: { backgroundColor: 'rgba(59,130,246,0.35)', borderColor: 'rgba(59,130,246,0.55)' },
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)' },
  btnText: { color: '#fff', fontWeight: '900' },
  note: { color: '#9aa4b2', fontSize: 12, lineHeight: 18, marginTop: 10 },
  input: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  frame: {
    width: 240,
    height: 240,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.75)',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  overlayText: { color: '#fff', marginTop: 14, fontWeight: '900' },
});

