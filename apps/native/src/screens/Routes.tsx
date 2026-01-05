import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { WebRoute } from '../navigation/webRoutes';
import { WEB_ROUTES } from '../navigation/webRoutes';

type Nav = {
  navigate: (name: string, params?: any) => void;
};

function groupBy(routes: WebRoute[]) {
  const m = new Map<string, WebRoute[]>();
  for (const r of routes) {
    const arr = m.get(r.group) ?? [];
    arr.push(r);
    m.set(r.group, arr);
  }
  return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

export default function RoutesScreen({ navigation }: { navigation: Nav }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return WEB_ROUTES;
    return WEB_ROUTES.filter(
      (r) => r.label.toLowerCase().includes(query) || r.pathTemplate.toLowerCase().includes(query) || r.group.toLowerCase().includes(query),
    );
  }, [q]);

  const groups = useMemo(() => groupBy(filtered), [filtered]);

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Text style={styles.title}>All Routes</Text>
        <Text style={styles.sub}>
          WebView fallback list. As we migrate, entries will become native screens.
        </Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search routes…"
          placeholderTextColor="#6b7280"
          style={styles.search}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        {groups.map(([group, routes]) => (
          <View key={group} style={{ marginBottom: 16 }}>
            <Text style={styles.groupTitle}>{group}</Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              {routes.map((r) => (
                <Pressable
                  key={r.id}
                  style={styles.item}
                  onPress={() =>
                    navigation.navigate('WebRoute', {
                      title: r.label,
                      pathTemplate: r.pathTemplate,
                    })
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {r.label}
                    </Text>
                    <Text style={styles.itemPath} numberOfLines={1}>
                      {r.pathTemplate}
                    </Text>
                  </View>
                  <Text style={styles.chev}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1220' },
  top: {
    paddingTop: 16,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  sub: { color: '#9aa4b2', marginTop: 4, fontSize: 12 },
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
  groupTitle: { color: '#fff', fontWeight: '800', fontSize: 14 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    borderRadius: 14,
  },
  itemTitle: { color: '#fff', fontWeight: '700' },
  itemPath: { color: '#9aa4b2', marginTop: 2, fontSize: 12 },
  chev: { color: '#9aa4b2', fontSize: 22, marginLeft: 6 },
});

