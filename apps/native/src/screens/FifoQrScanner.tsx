import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '../lib/supabase';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

function extractWorkspaceIdFromUrl(value: string): string | null {
  try {
    const u = new URL(value);
    const ws = u.searchParams.get('workspace');
    if (ws) return ws;
    return null;
  } catch {
    return null;
  }
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.trim());
}

export default function FifoQrScannerScreen({ navigation }: { navigation: Nav }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);

  const canUseCamera = useMemo(() => permission?.granted === true, [permission?.granted]);

  async function onScan(value: string) {
    if (locked) return;
    setLocked(true);

    const raw = value.trim();
    const wsFromUrl = extractWorkspaceIdFromUrl(raw);

    // Primary: QR encodes join URL -> workspace id
    if (wsFromUrl && isUuid(wsFromUrl)) {
      navigation.navigate('FifoScanAccess', { workspaceId: wsFromUrl });
      return;
    }

    // Secondary: QR encodes a UUID directly. Prefer treating it as a qr_codes.id if it exists.
    if (isUuid(raw)) {
      try {
        const qrRes = await supabase
          .from('qr_codes')
          .select('id')
          .eq('id', raw)
          .eq('qr_type', 'fifo_workspace_access')
          .maybeSingle();

        if (!qrRes.error && qrRes.data?.id) {
          navigation.navigate('FifoScanAccess', { qrCodeId: raw });
          return;
        }
      } catch {
        // ignore
      }

      navigation.navigate('FifoScanAccess', { workspaceId: raw });
      return;
    }

    Alert.alert('Unrecognized QR', 'This code is not a FIFO workspace join QR.');
    setLocked(false);
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
            <Text style={styles.title}>Scan FIFO QR</Text>
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
          <Text style={styles.title}>Scan FIFO QR</Text>
          <Text style={styles.sub}>Point camera at the QR code.</Text>
        </View>
        <Pressable style={[styles.btn, styles.secondaryBtn]} onPress={() => setLocked(false)}>
          <Text style={styles.btnText}>Reset</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        <CameraView
          style={{ flex: 1 }}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={(e) => onScan(e.data)}
        />
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

