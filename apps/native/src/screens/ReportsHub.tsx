import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { WEB_ROUTES } from '../navigation/webRoutes';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

export default function ReportsHubScreen({ navigation }: { navigation: Nav }) {
  const [q, setQ] = useState('');

  const routes = useMemo(() => WEB_ROUTES.filter((r) => r.group === 'Reports'), []);
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return routes;
    return routes.filter((r) => r.label.toLowerCase().includes(query) || r.pathTemplate.toLowerCase().includes(query));
  }, [q, routes]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Reports
          </Text>
          <Text style={styles.sub} numberOfLines={2}>
            Reports are opened in WebView until ported natively.
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Search</Text>
          <TextInput value={q} onChangeText={setQ} placeholder="P&L, sales, labor, cash flow…" placeholderTextColor="#6b7280" style={styles.search} />
          <Text style={styles.muted} numberOfLines={3}>
            Tip: start with “Profit & Loss”, “Daily Sales”, “Cash Flow”, “COGS”, and “Labor Cost”.
          </Text>
        </View>

        <View style={{ height: 12 }} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>All report routes</Text>
          <View style={{ gap: 8, marginTop: 10 }}>
            {filtered.map((r) => (
              <Pressable
                key={r.id}
                style={styles.item}
                onPress={() =>
                  r.pathTemplate === '/reports/profit-loss'
                    ? navigation.navigate('ProfitLossReport')
                    : r.pathTemplate === '/reports/daily-sales'
                      ? navigation.navigate('DailySalesReport')
                      : r.pathTemplate === '/reports/cash-flow'
                        ? navigation.navigate('CashFlowReport')
                        : r.pathTemplate === '/reports/labor-cost'
                          ? navigation.navigate('LaborCostReport')
                          : r.pathTemplate === '/reports/cogs'
                            ? navigation.navigate('COGSReport')
                            : r.pathTemplate === '/reports/budget-actual'
                              ? navigation.navigate('BudgetActualReport')
                            : r.pathTemplate === '/reports/stock-movement'
                              ? navigation.navigate('StockMovementReport')
                            : r.pathTemplate === '/reports/revenue-category'
                              ? navigation.navigate('RevenueByCategoryReport')
                            : r.pathTemplate === '/reports/breakeven'
                              ? navigation.navigate('BreakevenReport')
                            : r.pathTemplate === '/reports/daily-ops'
                              ? navigation.navigate('DailyOpsReport')
                      : navigation.navigate('WebRoute', {
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
            {filtered.length === 0 ? <Text style={styles.muted}>No matches.</Text> : null}
          </View>
        </View>
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
  muted: { color: '#9aa4b2', marginTop: 8, fontSize: 12, lineHeight: 18 },
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
  itemTitle: { color: '#fff', fontWeight: '900' },
  itemPath: { color: '#9aa4b2', fontSize: 12, marginTop: 2 },
  chev: { color: '#9aa4b2', fontSize: 18, fontWeight: '800' },
});

