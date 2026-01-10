import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { WEB_ROUTES } from '../navigation/webRoutes';

type Nav = { navigate: (name: string, params?: any) => void; goBack: () => void };

type ToolItem = { id: string; title: string; pathTemplate: string; category: string };

const OPS_TOOL_PATHS = [
  // Reports / finance
  '/sales-report',
  '/inventory-valuation-report',
  '/variance-report',
  '/reports/budget-actual',
  '/pour-cost-analysis',
  '/wastage-tracker',
  '/stock-audit',
  '/menu-engineering',
  '/menu-engineering-pro',

  // Inventory / ops
  '/inventory-manager',
  '/store-management',
  '/workspace-management',
  '/master-items',
  '/temperature-log',

  // Procurement
  '/purchase-orders',
  '/procurement-analytics',
  '/procurement-pin-access',
  '/procurement-staff',

  // Batch & calculators
  '/batch-calculator',
  '/batch-recipes',
  '/batch-activity',
  '/sub-recipes',
  '/master-spirits',
  '/abv-calculator',
  '/scaling-tool',
  '/cost-calculator',
  '/yield-calculator',
  '/batch-qr/:qrId',
];

function toCategory(pathTemplate: string): string {
  if (pathTemplate.startsWith('/reports/') || ['/sales-report', '/inventory-valuation-report', '/variance-report', '/pour-cost-analysis', '/wastage-tracker', '/stock-audit', '/menu-engineering', '/menu-engineering-pro'].includes(pathTemplate)) {
    return 'Reports';
  }
  if (pathTemplate.startsWith('/purchase-orders') || pathTemplate.startsWith('/po-') || pathTemplate.startsWith('/procurement')) return 'Procurement';
  if (pathTemplate.startsWith('/batch') || pathTemplate === '/sub-recipes' || pathTemplate === '/master-spirits' || pathTemplate.endsWith('-calculator') || pathTemplate.endsWith('-tool') || pathTemplate.endsWith('-analysis') || pathTemplate === '/yield-calculator') {
    return 'Batch & Calculators';
  }
  if (pathTemplate.startsWith('/inventory') || pathTemplate.startsWith('/store') || pathTemplate.startsWith('/master-items') || pathTemplate.startsWith('/temperature-log') || pathTemplate.startsWith('/workspace-management')) {
    return 'Inventory';
  }
  return 'Other';
}

export default function OpsToolsHubScreen({ navigation }: { navigation: Nav }) {
  const [q, setQ] = useState('');

  const tools = useMemo<ToolItem[]>(() => {
    const set = new Set(OPS_TOOL_PATHS);
    const routes = WEB_ROUTES.filter((r) => set.has(r.pathTemplate));
    // In case some entries aren't in WEB_ROUTES (safety)
    const extras = OPS_TOOL_PATHS.filter((p) => !routes.find((r) => r.pathTemplate === p)).map((p) => ({
      id: `custom-${p}`,
      label: p,
      pathTemplate: p,
      group: 'Ops Tools',
    }));

    const merged = [...routes, ...extras].map((r) => ({
      id: r.id,
      title: r.label,
      pathTemplate: r.pathTemplate,
      category: toCategory(r.pathTemplate),
    }));

    // Deterministic ordering
    const order = ['Reports', 'Inventory', 'Procurement', 'Batch & Calculators', 'Other'];
    return merged.sort((a, b) => {
      const ai = order.indexOf(a.category);
      const bi = order.indexOf(b.category);
      if (ai !== bi) return ai - bi;
      return a.title.localeCompare(b.title);
    });
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return tools;
    return tools.filter((t) => `${t.title} ${t.pathTemplate} ${t.category}`.toLowerCase().includes(query));
  }, [q, tools]);

  const groups = useMemo(() => {
    const m = new Map<string, ToolItem[]>();
    for (const it of filtered) {
      const arr = m.get(it.category) ?? [];
      arr.push(it);
      m.set(it.category, arr);
    }
    return Array.from(m.entries());
  }, [filtered]);

  function openTool(pathTemplate: string, title: string) {
    // Native mappings for best UX
    if (pathTemplate === '/batch-calculator') return navigation.navigate('BatchCalculator');
    if (pathTemplate === '/batch-recipes') return navigation.navigate('BatchRecipes');
    if (pathTemplate === '/batch-activity') return navigation.navigate('BatchActivity');
    if (pathTemplate === '/sub-recipes') return navigation.navigate('SubRecipes');
    if (pathTemplate === '/master-spirits') return navigation.navigate('MasterSpirits');
    if (pathTemplate === '/abv-calculator') return navigation.navigate('ABVCalculator');
    if (pathTemplate === '/scaling-tool') return navigation.navigate('ScalingTool');
    if (pathTemplate === '/cost-calculator') return navigation.navigate('CostCalculator');
    if (pathTemplate === '/yield-calculator') return navigation.navigate('YieldCalculator');
    if (pathTemplate === '/temperature-log') return navigation.navigate('TemperatureLog');
    if (pathTemplate === '/sales-report') return navigation.navigate('SalesReport');
    if (pathTemplate === '/inventory-valuation-report') return navigation.navigate('InventoryValuationReport');
    if (pathTemplate === '/variance-report') return navigation.navigate('VarianceReport');
    if (pathTemplate === '/reports/budget-actual') return navigation.navigate('BudgetActualReport');
    if (pathTemplate === '/pour-cost-analysis') return navigation.navigate('PourCostAnalysis');
    if (pathTemplate === '/wastage-tracker') return navigation.navigate('WastageTracker');
    if (pathTemplate === '/stock-audit') return navigation.navigate('StockAudit');
    if (pathTemplate === '/menu-engineering') return navigation.navigate('MenuEngineering');
    if (pathTemplate === '/menu-engineering-pro') return navigation.navigate('MenuEngineeringPro');
    if (pathTemplate === '/purchase-orders') return navigation.navigate('PurchaseOrders');
    if (pathTemplate === '/procurement-analytics') return navigation.navigate('ProcurementAnalytics');
    if (pathTemplate === '/procurement-pin-access') return navigation.navigate('ProcurementPinAccess');
    if (pathTemplate === '/procurement-staff') return navigation.navigate('ProcurementStaffManager');
    if (pathTemplate === '/inventory-manager') return navigation.navigate('InventoryManager');
    if (pathTemplate === '/store-management') return navigation.navigate('StoreManagement');
    if (pathTemplate === '/master-items') return navigation.navigate('MasterItems');

    // Batch QR: send to scanner instead of asking for qrId
    if (pathTemplate === '/batch-qr/:qrId') return navigation.navigate('BatchQrScanner');

    // Fallback to WebView route
    return navigation.navigate('WebRoute', { title, pathTemplate });
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            Ops Tools
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Native hub with Web fallback
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Search</Text>
          <TextInput value={q} onChangeText={setQ} placeholder="Search tools…" placeholderTextColor="#6b7280" style={styles.search} />
          <Text style={styles.muted}>Tools open native when available; otherwise they open in WebView.</Text>
        </View>

        <View style={{ height: 12 }} />

        {groups.map(([category, items]) => (
          <View key={category} style={{ marginBottom: 16 }}>
            <Text style={styles.groupTitle}>{category}</Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              {items.map((it) => (
                <Pressable key={`${it.category}-${it.pathTemplate}`} style={styles.item} onPress={() => openTool(it.pathTemplate, it.title)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {it.title}
                    </Text>
                    <Text style={styles.itemPath} numberOfLines={1}>
                      {it.pathTemplate}
                    </Text>
                  </View>
                  <Text style={styles.chev}>›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {filtered.length === 0 ? <Text style={styles.muted}>No matches.</Text> : null}
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
  groupTitle: { color: '#fff', fontWeight: '900', fontSize: 14 },
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

