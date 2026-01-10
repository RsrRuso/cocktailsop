import React, { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildWebUrl } from '../lib/web';

function extractParamNames(template: string): string[] {
  const matches = template.matchAll(/:([A-Za-z0-9_]+)/g);
  const names = new Set<string>();
  for (const m of matches) names.add(m[1]);
  return Array.from(names);
}

function fillTemplate(template: string, params: Record<string, string>) {
  return template.replace(/:([A-Za-z0-9_]+)/g, (_m, name: string) => params[name] ?? `:${name}`);
}

export default function WebRouteScreen({
  route,
  navigation,
}: {
  route: { params: { pathTemplate: string; title?: string } };
  navigation: { navigate: (name: string, params?: any) => void };
}) {
  const template = route.params.pathTemplate;
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

  const paramNames = useMemo(() => extractParamNames(template), [template]);
  const filledPath = useMemo(() => fillTemplate(template, paramValues), [template, paramValues]);

  const hasUnfilledParams = useMemo(
    () => paramNames.some((n) => !paramValues[n]?.trim()),
    [paramNames, paramValues],
  );

  const url = useMemo(() => {
    if (hasUnfilledParams) return '';
    return buildWebUrl(filledPath);
  }, [filledPath, hasUnfilledParams]);

  const canOpenNativeBatchQr = useMemo(() => {
    if (!template.startsWith('/batch-qr/')) return false;
    const qrId = paramValues.qrId?.trim();
    return !!qrId;
  }, [paramValues.qrId, template]);

  const [reloadKey, setReloadKey] = useState(0);

  const header = (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {route.params.title ?? 'Web'}
        </Text>
        <Text style={styles.headerSub} numberOfLines={1}>
          {template}
        </Text>
      </View>
      <Pressable
        onPress={() => {
          if (!url) {
            Alert.alert('Missing params', 'Fill the required route parameters first.');
            return;
          }
          Linking.openURL(url).catch(() => {});
        }}
        style={styles.headerBtn}
      >
        <Text style={styles.headerBtnText}>Open</Text>
      </Pressable>
      {canOpenNativeBatchQr ? (
        <Pressable
          onPress={() => navigation.navigate('BatchQRSubmit', { qrId: paramValues.qrId?.trim() })}
          style={styles.headerBtn}
        >
          <Text style={styles.headerBtnText}>Open native</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={() => setReloadKey((k) => k + 1)} style={styles.headerBtn}>
        <Text style={styles.headerBtnText}>Reload</Text>
      </Pressable>
    </View>
  );

  if (!buildWebUrl('/')) {
    return (
      <View style={[styles.root, { padding: 16 }]}>
        {header}
        <Text style={{ color: '#fff', marginTop: 12, fontWeight: '700' }}>Missing web base URL</Text>
        <Text style={{ color: '#9aa4b2', marginTop: 6 }}>
          Set <Text style={{ color: '#fff' }}>EXPO_PUBLIC_WEB_BASE_URL</Text> in <Text style={{ color: '#fff' }}>apps/native/.env</Text>.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {header}

      {paramNames.length > 0 && hasUnfilledParams ? (
        <ScrollView style={{ padding: 12 }} contentContainerStyle={{ gap: 10 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Enter route parameters</Text>
          {paramNames.map((n) => (
            <View key={n} style={{ gap: 6 }}>
              <Text style={{ color: '#9aa4b2' }}>{n}</Text>
              <TextInput
                value={paramValues[n] ?? ''}
                onChangeText={(v) => setParamValues((p) => ({ ...p, [n]: v }))}
                placeholder={`:${n}`}
                placeholderTextColor="#6b7280"
                autoCapitalize="none"
                style={styles.input}
              />
            </View>
          ))}
          <Pressable
            onPress={() => {
              if (extractParamNames(template).some((n) => !paramValues[n]?.trim())) return;
              setReloadKey((k) => k + 1);
            }}
            style={[styles.primaryBtn, hasUnfilledParams && { opacity: 0.6 }]}
            disabled={hasUnfilledParams}
          >
            <Text style={styles.primaryBtnText}>Open route</Text>
          </Pressable>
          <Text style={{ color: '#9aa4b2' }}>
            This is a WebView fallback. As we migrate, these routes will become true native screens.
          </Text>
        </ScrollView>
      ) : (
        <WebView
          key={String(reloadKey)}
          source={{ uri: url }}
          style={{ flex: 1, backgroundColor: '#0b1220' }}
          startInLoadingState
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1220' },
  header: {
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSub: { color: '#9aa4b2', fontSize: 12, marginTop: 2 },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  headerBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  primaryBtn: {
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
});

