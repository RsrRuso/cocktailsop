import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type Nav = { navigate: (name: string, params?: any) => void };

type LinkItem = {
  id: string;
  title: string;
  pathTemplate: string;
  group: string;
  note?: string;
};

const LINKS: LinkItem[] = [
  // Inventory (first migration target)
  { id: 'inventory-manager', title: 'Inventory Manager', pathTemplate: '/inventory-manager', group: 'Inventory' },
  { id: 'all-inventory', title: 'All Inventory', pathTemplate: '/all-inventory', group: 'Inventory' },
  { id: 'inventory-transactions', title: 'Inventory Transactions', pathTemplate: '/inventory-transactions', group: 'Inventory' },
  { id: 'master-items', title: 'Master Items', pathTemplate: '/master-items', group: 'Inventory' },
  { id: 'temperature-log', title: 'Temperature Log', pathTemplate: '/temperature-log', group: 'Inventory' },
  { id: 'stores-admin', title: 'Stores Admin', pathTemplate: '/stores-admin', group: 'Inventory' },
  { id: 'store-management', title: 'Store Management', pathTemplate: '/store-management', group: 'Inventory' },
  { id: 'store-detail', title: 'Store Detail', pathTemplate: '/store/:id', group: 'Inventory', note: 'Requires :id' },
  { id: 'workspace-management', title: 'Workspace Management', pathTemplate: '/workspace-management', group: 'Inventory' },

  // Batch / calculators
  { id: 'batch-pin-access', title: 'Batch PIN Access', pathTemplate: '/batch-calculator-pin-access', group: 'Batch' },
  { id: 'batch-calculator', title: 'Batch Calculator', pathTemplate: '/batch-calculator', group: 'Batch' },
  { id: 'batch-recipes', title: 'Batch Recipes', pathTemplate: '/batch-recipes', group: 'Batch' },
  { id: 'batch-view', title: 'Batch View', pathTemplate: '/batch-view/:productionId', group: 'Batch', note: 'Requires :productionId' },
  { id: 'abv-calculator', title: 'ABV Calculator', pathTemplate: '/abv-calculator', group: 'Batch' },
  { id: 'scaling-tool', title: 'Scaling Tool', pathTemplate: '/scaling-tool', group: 'Batch' },
  { id: 'cost-calculator', title: 'Cost Calculator', pathTemplate: '/cost-calculator', group: 'Batch' },
  { id: 'yield-calculator', title: 'Yield Calculator', pathTemplate: '/yield-calculator', group: 'Batch' },
  { id: 'sub-recipes', title: 'Sub-Recipes', pathTemplate: '/sub-recipes', group: 'Batch' },
  { id: 'master-spirits', title: 'Master Spirits', pathTemplate: '/master-spirits', group: 'Batch' },
  { id: 'batch-activity', title: 'Batch Activity', pathTemplate: '/batch-activity', group: 'Batch' },
  { id: 'batch-qr-scan', title: 'Scan Batch QR', pathTemplate: '/batch-qr-scan', group: 'Batch', note: 'Camera' },

  // FIFO
  { id: 'fifo-workspaces', title: 'FIFO Workspace Management', pathTemplate: '/fifo-workspace-management', group: 'FIFO' },
  { id: 'fifo-pin-access', title: 'FIFO PIN Access', pathTemplate: '/fifo-pin-access', group: 'FIFO' },
  { id: 'fifo-scan-access', title: 'FIFO Join (QR / Workspace ID)', pathTemplate: '/fifo-scan-access/:qrCodeId?', group: 'FIFO' },
  { id: 'fifo-approvals', title: 'FIFO Access Approvals', pathTemplate: '/fifo-access-approval', group: 'FIFO' },
  { id: 'fifo-qr-access', title: 'FIFO QR Access Code', pathTemplate: '/fifo-qr-access-code', group: 'FIFO' },
  { id: 'fifo-qr-scan', title: 'FIFO Scan QR (Camera)', pathTemplate: '/fifo-scan', group: 'FIFO' },
  { id: 'fifo-members', title: 'FIFO Members & PINs', pathTemplate: '/fifo-members', group: 'FIFO' },
  { id: 'fifo-activity', title: 'FIFO Activity Log', pathTemplate: '/fifo-activity-log', group: 'FIFO' },

  // Procurement
  { id: 'proc-pin-access', title: 'Procurement PIN Access', pathTemplate: '/procurement-pin-access', group: 'Procurement' },
  { id: 'proc-staff', title: 'Procurement Staff & PINs', pathTemplate: '/procurement-staff', group: 'Procurement' },
  { id: 'proc-analytics', title: 'Procurement Analytics', pathTemplate: '/procurement-analytics', group: 'Procurement' },
  { id: 'purchase-orders', title: 'Purchase Orders', pathTemplate: '/purchase-orders', group: 'Procurement' },
  { id: 'po-master', title: 'PO Master Items', pathTemplate: '/po-master-items', group: 'Procurement' },
  { id: 'po-received', title: 'PO Received Items', pathTemplate: '/po-received-items', group: 'Procurement' },

  // Reports
  { id: 'reports-hub', title: 'Reports Hub', pathTemplate: '/financial-reports', group: 'Reports' },

  // Staff/POS
  { id: 'staff-scheduling', title: 'Staff Scheduling', pathTemplate: '/staff-scheduling', group: 'Staff & POS' },
  { id: 'staff-pos', title: 'Staff POS', pathTemplate: '/staff-pos', group: 'Staff & POS' },
  { id: 'bar-kds', title: 'Bar KDS', pathTemplate: '/bar-kds', group: 'Staff & POS' },
  { id: 'kitchen-kds', title: 'Kitchen KDS', pathTemplate: '/kitchen-kds', group: 'Staff & POS' },
];

function groupBy(items: LinkItem[]) {
  const m = new Map<string, LinkItem[]>();
  for (const it of items) {
    const arr = m.get(it.group) ?? [];
    arr.push(it);
    m.set(it.group, arr);
  }
  return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

export default function OpsScreen({ navigation }: { navigation: Nav }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return LINKS;
    return LINKS.filter(
      (l) =>
        l.title.toLowerCase().includes(query) ||
        l.pathTemplate.toLowerCase().includes(query) ||
        l.group.toLowerCase().includes(query),
    );
  }, [q]);

  const groups = useMemo(() => groupBy(filtered), [filtered]);

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Text style={styles.title}>Ops</Text>
        <Text style={styles.sub}>
          Inventory-first native migration. Items open via WebView until replaced with true native screens.
        </Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search ops…"
          placeholderTextColor="#6b7280"
          style={styles.search}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 96 }}>
        {groups.map(([group, items]) => (
          <View key={group} style={{ marginBottom: 16 }}>
            <Text style={styles.groupTitle}>{group}</Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              {items.map((it) => (
                <Pressable
                  key={it.id}
                  style={styles.item}
                  onPress={() => {
                    if (it.id === 'inventory-manager') {
                      navigation.navigate('InventoryManager');
                      return;
                    }
                    if (it.id === 'all-inventory') {
                      navigation.navigate('AllInventory');
                      return;
                    }
                    if (it.id === 'inventory-transactions') {
                      navigation.navigate('InventoryTransactions');
                      return;
                    }
                    if (it.id === 'master-items') {
                      navigation.navigate('MasterItems');
                      return;
                    }
                    if (it.id === 'temperature-log') {
                      navigation.navigate('TemperatureLog');
                      return;
                    }
                    if (it.id === 'stores-admin' || it.id === 'store-management' || it.id === 'store-detail') {
                      navigation.navigate('StoreManagement');
                      return;
                    }
                    if (it.id === 'fifo-workspaces') {
                      navigation.navigate('FifoWorkspaceManagement');
                      return;
                    }
                    if (it.id === 'fifo-pin-access') {
                      navigation.navigate('FifoPinAccess');
                      return;
                    }
                    if (it.id === 'fifo-scan-access') {
                      navigation.navigate('FifoScanAccess');
                      return;
                    }
                    if (it.id === 'fifo-approvals') {
                      navigation.navigate('FifoAccessApproval');
                      return;
                    }
                    if (it.id === 'fifo-qr-access') {
                      navigation.navigate('FifoQRAccessCode');
                      return;
                    }
                    if (it.id === 'fifo-qr-scan') {
                      navigation.navigate('FifoQrScanner');
                      return;
                    }
                    if (it.id === 'fifo-members') {
                      navigation.navigate('FifoMemberManager');
                      return;
                    }
                    if (it.id === 'fifo-activity') {
                      navigation.navigate('FifoWorkspaceManagement');
                      return;
                    }
                    if (it.id === 'batch-pin-access') {
                      navigation.navigate('BatchPinAccess');
                      return;
                    }
                    if (it.id === 'batch-calculator') {
                      navigation.navigate('BatchCalculator');
                      return;
                    }
                    if (it.id === 'batch-recipes') {
                      navigation.navigate('BatchRecipes');
                      return;
                    }
                    if (it.id === 'abv-calculator') {
                      navigation.navigate('ABVCalculator');
                      return;
                    }
                    if (it.id === 'scaling-tool') {
                      navigation.navigate('ScalingTool');
                      return;
                    }
                    if (it.id === 'cost-calculator') {
                      navigation.navigate('CostCalculator');
                      return;
                    }
                    if (it.id === 'yield-calculator') {
                      navigation.navigate('YieldCalculator');
                      return;
                    }
                    if (it.id === 'sub-recipes') {
                      navigation.navigate('SubRecipes');
                      return;
                    }
                    if (it.id === 'master-spirits') {
                      navigation.navigate('MasterSpirits');
                      return;
                    }
                    if (it.id === 'batch-activity') {
                      navigation.navigate('BatchActivity');
                      return;
                    }
                    if (it.id === 'batch-qr-scan') {
                      navigation.navigate('BatchQrScanner');
                      return;
                    }
                    if (it.id === 'purchase-orders') {
                      navigation.navigate('PurchaseOrders');
                      return;
                    }
                    if (it.id === 'po-master') {
                      navigation.navigate('POMasterItems');
                      return;
                    }
                    if (it.id === 'po-received') {
                      navigation.navigate('POReceivedItems');
                      return;
                    }
                    if (it.id === 'proc-pin-access') {
                      navigation.navigate('ProcurementPinAccess');
                      return;
                    }
                    if (it.id === 'proc-staff') {
                      navigation.navigate('ProcurementStaffManager');
                      return;
                    }
                    if (it.id === 'proc-analytics') {
                      navigation.navigate('ProcurementAnalytics');
                      return;
                    }
                    if (it.id === 'reports-hub') {
                      navigation.navigate('ReportsHub');
                      return;
                    }
                    navigation.navigate('WebRoute', {
                      title: it.title,
                      pathTemplate: it.pathTemplate,
                    });
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {it.title}
                    </Text>
                    <Text style={styles.itemPath} numberOfLines={1}>
                      {it.pathTemplate}
                      {it.note ? ` • ${it.note}` : ''}
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

