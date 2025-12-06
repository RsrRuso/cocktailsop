import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, Search, Download, FileText, Calendar, Clock, DollarSign,
  ClipboardList, ChefHat, Wine, TrendingUp, Filter, User, Eye, RefreshCw
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface MemberTransactionsReportProps {
  outletId: string;
}

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

interface Transaction {
  id: string;
  type: 'order' | 'order_update' | 'item_ready' | 'payment' | 'void' | 'discount';
  staff_id: string;
  staff_name: string;
  staff_role: string;
  timestamp: string;
  details: string;
  amount?: number;
  table_name?: string;
  order_id?: string;
  items_count?: number;
}

interface StaffStats {
  staff_id: string;
  staff_name: string;
  staff_role: string;
  total_orders: number;
  total_revenue: number;
  avg_check: number;
  items_prepared: number;
  voids: number;
  discounts_applied: number;
  first_transaction: string;
  last_transaction: string;
}

export default function MemberTransactionsReport({ outletId }: MemberTransactionsReportProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [staffStats, setStaffStats] = useState<StaffStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState("7d");
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<StaffStats | null>(null);

  useEffect(() => {
    loadData();
  }, [outletId, dateRange, selectedStaff]);

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case "1d": return new Date(now.setDate(now.getDate() - 1)).toISOString();
      case "7d": return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case "30d": return new Date(now.setDate(now.getDate() - 30)).toISOString();
      case "90d": return new Date(now.setDate(now.getDate() - 90)).toISOString();
      default: return new Date(now.setDate(now.getDate() - 7)).toISOString();
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchStaff(),
      fetchTransactions(),
    ]);
    setIsLoading(false);
  };

  const fetchStaff = async () => {
    const { data } = await supabase
      .from("lab_ops_staff")
      .select("id, full_name, role, is_active")
      .eq("outlet_id", outletId)
      .order("full_name");
    setStaff(data || []);
  };

  const fetchTransactions = async () => {
    const dateFilter = getDateFilter();
    const allTransactions: Transaction[] = [];
    const statsMap: Record<string, StaffStats> = {};

    // Fetch staff for name mapping
    const { data: staffData } = await supabase
      .from("lab_ops_staff")
      .select("id, full_name, role")
      .eq("outlet_id", outletId);

    const staffMap: Record<string, { name: string; role: string }> = {};
    staffData?.forEach(s => {
      staffMap[s.id] = { name: s.full_name || 'Unknown', role: s.role || 'staff' };
    });

    // Initialize stats for all staff
    staffData?.forEach(s => {
      statsMap[s.id] = {
        staff_id: s.id,
        staff_name: s.full_name || 'Unknown',
        staff_role: s.role || 'staff',
        total_orders: 0,
        total_revenue: 0,
        avg_check: 0,
        items_prepared: 0,
        voids: 0,
        discounts_applied: 0,
        first_transaction: '',
        last_transaction: '',
      };
    });

    // Fetch orders (created by server)
    const { data: orders } = await supabase
      .from("lab_ops_orders")
      .select("id, server_id, status, total_amount, opened_at, closed_at, covers, discount_total, lab_ops_tables(name)")
      .eq("outlet_id", outletId)
      .gte("opened_at", dateFilter)
      .order("opened_at", { ascending: false });

    orders?.forEach(order => {
      const serverId = order.server_id;
      if (!serverId) return;
      
      const staffInfo = staffMap[serverId] || { name: 'Unknown', role: 'staff' };
      const tableName = (order.lab_ops_tables as any)?.name || 'Unknown';
      
      // Order opened transaction
      allTransactions.push({
        id: `order-open-${order.id}`,
        type: 'order',
        staff_id: serverId,
        staff_name: staffInfo.name,
        staff_role: staffInfo.role,
        timestamp: order.opened_at,
        details: `Opened order at ${tableName}`,
        table_name: tableName,
        order_id: order.id,
      });

      // Update stats
      if (statsMap[serverId]) {
        statsMap[serverId].total_orders += 1;
        if (!statsMap[serverId].first_transaction || order.opened_at < statsMap[serverId].first_transaction) {
          statsMap[serverId].first_transaction = order.opened_at;
        }
        if (!statsMap[serverId].last_transaction || order.opened_at > statsMap[serverId].last_transaction) {
          statsMap[serverId].last_transaction = order.opened_at;
        }
      }

      // Order closed (payment) transaction
      if (order.status === 'closed' && order.closed_at) {
        allTransactions.push({
          id: `order-close-${order.id}`,
          type: 'payment',
          staff_id: serverId,
          staff_name: staffInfo.name,
          staff_role: staffInfo.role,
          timestamp: order.closed_at,
          details: `Closed order at ${tableName}`,
          amount: order.total_amount || 0,
          table_name: tableName,
          order_id: order.id,
        });

        if (statsMap[serverId]) {
          statsMap[serverId].total_revenue += order.total_amount || 0;
          if (order.discount_total && order.discount_total > 0) {
            statsMap[serverId].discounts_applied += 1;
          }
        }
      }
    });

    // Fetch order items for KDS tracking (items marked ready)
    const { data: orderItems } = await supabase
      .from("lab_ops_order_items")
      .select("id, status, qty, ready_at, station_id, lab_ops_menu_items(name), lab_ops_orders!inner(outlet_id, opened_at, server_id)")
      .eq("lab_ops_orders.outlet_id", outletId)
      .gte("lab_ops_orders.opened_at", dateFilter);

    orderItems?.forEach((item: any) => {
      if (item.ready_at) {
        // Use server_id from order as the preparer for tracking
        const preparerId = item.lab_ops_orders?.server_id;
        if (preparerId) {
          const staffInfo = staffMap[preparerId] || { name: 'Unknown', role: 'kitchen' };
          const itemName = item.lab_ops_menu_items?.name || 'Unknown Item';
          
          allTransactions.push({
            id: `item-ready-${item.id}`,
            type: 'item_ready',
            staff_id: preparerId,
            staff_name: staffInfo.name,
            staff_role: staffInfo.role,
            timestamp: item.ready_at,
            details: `Prepared ${item.qty}x ${itemName}`,
            items_count: item.qty,
          });

          if (statsMap[preparerId]) {
            statsMap[preparerId].items_prepared += item.qty || 1;
          }
        }
      }
    });

    // Fetch voids
    const { data: voids } = await supabase
      .from("lab_ops_voids")
      .select("id, staff_id, created_at, notes, lab_ops_void_reasons(description)")
      .gte("created_at", dateFilter);

    voids?.forEach((v: any) => {
      if (v.staff_id && staffMap[v.staff_id]) {
        const staffInfo = staffMap[v.staff_id] || { name: 'Unknown', role: 'staff' };
        const reason = v.lab_ops_void_reasons?.description || v.notes || 'Void';
        
        allTransactions.push({
          id: `void-${v.id}`,
          type: 'void',
          staff_id: v.staff_id,
          staff_name: staffInfo.name,
          staff_role: staffInfo.role,
          timestamp: v.created_at,
          details: `Void: ${reason}`,
          amount: 0,
        });

        if (statsMap[v.staff_id]) {
          statsMap[v.staff_id].voids += 1;
        }
      }
    });

    // Sort transactions by timestamp
    allTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate averages
    Object.values(statsMap).forEach(stat => {
      if (stat.total_orders > 0) {
        stat.avg_check = stat.total_revenue / stat.total_orders;
      }
    });

    // Filter by selected staff
    let filteredTransactions = allTransactions;
    if (selectedStaff !== "all") {
      filteredTransactions = allTransactions.filter(t => t.staff_id === selectedStaff);
    }

    setTransactions(filteredTransactions);
    setStaffStats(Object.values(statsMap).sort((a, b) => b.total_revenue - a.total_revenue));
  };

  const filteredTransactions = transactions.filter(t => 
    t.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.staff_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportToPDF = () => {
    const doc = new jsPDF();
    const now = new Date();

    // Title
    doc.setFontSize(18);
    doc.text("Member Transactions Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(now, "PPpp")}`, 14, 28);
    doc.text(`Period: Last ${dateRange}`, 14, 34);

    // Staff Summary Table
    doc.setFontSize(14);
    doc.text("Staff Performance Summary", 14, 45);

    autoTable(doc, {
      startY: 50,
      head: [["Staff", "Role", "Orders", "Revenue", "Avg Check", "Items Prepared", "Voids"]],
      body: staffStats.map(s => [
        s.staff_name,
        s.staff_role,
        s.total_orders.toString(),
        `$${s.total_revenue.toFixed(2)}`,
        `$${s.avg_check.toFixed(2)}`,
        s.items_prepared.toString(),
        s.voids.toString(),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Transactions Table
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.setFontSize(14);
    doc.text("Recent Transactions", 14, finalY + 15);

    autoTable(doc, {
      startY: finalY + 20,
      head: [["Time", "Staff", "Type", "Details", "Amount"]],
      body: filteredTransactions.slice(0, 50).map(t => [
        format(new Date(t.timestamp), "MMM d, HH:mm"),
        t.staff_name,
        t.type.replace('_', ' '),
        t.details,
        t.amount ? `$${t.amount.toFixed(2)}` : '-',
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`member-transactions-${format(now, "yyyy-MM-dd")}.pdf`);
    toast({ title: "PDF exported successfully" });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'order': return <ClipboardList className="h-4 w-4 text-blue-500" />;
      case 'payment': return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'item_ready': return <ChefHat className="h-4 w-4 text-orange-500" />;
      case 'void': return <Wine className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'order': return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/50">Order</Badge>;
      case 'payment': return <Badge className="bg-green-500/20 text-green-700 border-green-500/50">Payment</Badge>;
      case 'item_ready': return <Badge className="bg-orange-500/20 text-orange-700 border-orange-500/50">Prepared</Badge>;
      case 'void': return <Badge className="bg-red-500/20 text-red-700 border-red-500/50">Void</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const totalRevenue = staffStats.reduce((sum, s) => sum + s.total_revenue, 0);
  const totalOrders = staffStats.reduce((sum, s) => sum + s.total_orders, 0);
  const totalItems = staffStats.reduce((sum, s) => sum + s.items_prepared, 0);
  const totalVoids = staffStats.reduce((sum, s) => sum + s.voids, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Member Transaction Report
          </h2>
          <p className="text-sm text-muted-foreground">Every transaction by every member</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-28 h-9">
              <Calendar className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Today</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedStaff} onValueChange={setSelectedStaff}>
            <SelectTrigger className="w-36 h-9">
              <Filter className="h-4 w-4 mr-1" />
              <SelectValue placeholder="All Staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {staff.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" variant="outline" onClick={loadData} disabled={isLoading} className="h-9">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Button size="sm" variant="outline" onClick={exportToPDF} className="h-9">
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold">${totalRevenue.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Orders</p>
                <p className="text-xl font-bold">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <ChefHat className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Items Prepared</p>
                <p className="text-xl font-bold">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Wine className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Voids</p>
                <p className="text-xl font-bold">{totalVoids}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Performance Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Staff Performance Summary</CardTitle>
          <CardDescription>Click on a staff member for detailed breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {staffStats.filter(s => s.total_orders > 0 || s.items_prepared > 0).map((stat) => (
                <div 
                  key={stat.staff_id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => setSelectedStaffDetail(stat)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{stat.staff_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{stat.staff_role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-xs text-muted-foreground">Orders</p>
                      <p className="font-medium">{stat.total_orders}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="font-medium text-green-600">${stat.total_revenue.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Prepared</p>
                      <p className="font-medium">{stat.items_prepared}</p>
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
              {staffStats.filter(s => s.total_orders > 0 || s.items_prepared > 0).length === 0 && (
                <p className="text-center text-muted-foreground py-8">No activity data</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Transaction Feed */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Live Transaction Feed</CardTitle>
              <CardDescription>{filteredTransactions.length} transactions</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-48 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {filteredTransactions.slice(0, 100).map((txn) => (
                <div key={txn.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="mt-1">
                    {getTypeIcon(txn.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{txn.staff_name}</span>
                      <Badge variant="outline" className="text-xs capitalize">{txn.staff_role}</Badge>
                      {getTypeBadge(txn.type)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{txn.details}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(txn.timestamp), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  {txn.amount !== undefined && txn.amount > 0 && (
                    <div className="text-right">
                      <p className={`font-bold ${txn.type === 'void' ? 'text-red-500' : 'text-green-600'}`}>
                        ${txn.amount.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
              {filteredTransactions.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No transactions found</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Staff Detail Dialog */}
      <Dialog open={!!selectedStaffDetail} onOpenChange={(open) => !open && setSelectedStaffDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedStaffDetail?.staff_name}
            </DialogTitle>
          </DialogHeader>
          {selectedStaffDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{selectedStaffDetail.total_orders}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">${selectedStaffDetail.total_revenue.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Avg Check</p>
                    <p className="text-2xl font-bold">${selectedStaffDetail.avg_check.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Items Prepared</p>
                    <p className="text-2xl font-bold">{selectedStaffDetail.items_prepared}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role</span>
                    <span className="font-medium capitalize">{selectedStaffDetail.staff_role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Voids</span>
                    <span className={`font-medium ${selectedStaffDetail.voids > 0 ? 'text-red-500' : ''}`}>
                      {selectedStaffDetail.voids}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discounts Applied</span>
                    <span className="font-medium">{selectedStaffDetail.discounts_applied}</span>
                  </div>
                  {selectedStaffDetail.first_transaction && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">First Activity</span>
                      <span className="font-medium">{format(new Date(selectedStaffDetail.first_transaction), "MMM d, h:mm a")}</span>
                    </div>
                  )}
                  {selectedStaffDetail.last_transaction && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Activity</span>
                      <span className="font-medium">{format(new Date(selectedStaffDetail.last_transaction), "MMM d, h:mm a")}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Individual transactions for this staff */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {transactions.filter(t => t.staff_id === selectedStaffDetail.staff_id).slice(0, 20).map(txn => (
                        <div key={txn.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                          {getTypeIcon(txn.type)}
                          <span className="flex-1 truncate">{txn.details}</span>
                          {txn.amount && <span className="font-medium">${txn.amount.toFixed(0)}</span>}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}