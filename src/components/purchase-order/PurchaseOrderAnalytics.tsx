import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  TrendingUp, TrendingDown, Package, DollarSign, Calendar, 
  ShoppingCart, Layers, BarChart3, PieChart, List, ArrowUpRight, 
  ArrowDownRight, Leaf, Wrench, Box, Download, FileSpreadsheet
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface ItemSummary {
  item_name: string;
  item_code: string;
  totalQuantity: number;
  totalAmount: number;
  avgPrice: number;
  orderCount: number;
  unit?: string;
  category: 'market' | 'material' | 'unknown';
}

interface AnalyticsSummary {
  totalOrders: number;
  totalAmount: number;
  avgOrderValue: number;
  totalItems: number;
  uniqueItems: number;
  marketItems: { count: number; amount: number; items: ItemSummary[] };
  materialItems: { count: number; amount: number; items: ItemSummary[] };
  ordersByDate: { date: string; count: number; amount: number }[];
  ordersBySupplier: { supplier: string; count: number; amount: number }[];
  topItems: ItemSummary[];
  dailyAverage: number;
  weeklyTrend: number;
  monthlyComparison: { current: number; previous: number; change: number };
  itemsByCategory: { category: string; items: ItemSummary[] }[];
}

interface PurchaseOrderAnalyticsProps {
  analytics: AnalyticsSummary;
  formatCurrency: (amount: number) => string;
}

export const PurchaseOrderAnalytics = ({ analytics, formatCurrency }: PurchaseOrderAnalyticsProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'market' | 'material' | 'combined' | 'dates'>('overview');

  // Download helpers
  const downloadExcel = (data: any[], fileName: string, sheetName: string = 'Data') => {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${fileName}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success(`Downloaded ${fileName}`);
    } catch (error) {
      toast.error('Failed to download');
      console.error(error);
    }
  };

  const downloadOverview = () => {
    const data = [
      { Metric: 'Total Orders', Value: analytics.totalOrders },
      { Metric: 'Total Spend', Value: analytics.totalAmount.toFixed(2) },
      { Metric: 'Average Order Value', Value: analytics.avgOrderValue.toFixed(2) },
      { Metric: 'Daily Average', Value: analytics.dailyAverage.toFixed(2) },
      { Metric: 'Weekly Trend (%)', Value: analytics.weeklyTrend.toFixed(1) },
      { Metric: 'This Month', Value: analytics.monthlyComparison.current.toFixed(2) },
      { Metric: 'Last Month', Value: analytics.monthlyComparison.previous.toFixed(2) },
      { Metric: 'Monthly Change (%)', Value: analytics.monthlyComparison.change.toFixed(1) },
      { Metric: 'Unique Items', Value: analytics.uniqueItems },
      { Metric: 'Total Items Qty', Value: analytics.totalItems.toFixed(0) },
      { Metric: 'Market Items Count', Value: analytics.marketItems.count },
      { Metric: 'Market Items Spend', Value: analytics.marketItems.amount.toFixed(2) },
      { Metric: 'Material Items Count', Value: analytics.materialItems.count },
      { Metric: 'Material Items Spend', Value: analytics.materialItems.amount.toFixed(2) },
    ];
    downloadExcel(data, 'PO_Analytics_Overview', 'Overview');
  };

  const downloadTopItems = () => {
    const data = analytics.topItems.map((item, idx) => ({
      Rank: idx + 1,
      'Item Name': item.item_name,
      'Item Code': item.item_code || '-',
      Category: item.category === 'market' ? 'Market' : item.category === 'material' ? 'Material' : 'Other',
      'Total Quantity': item.totalQuantity.toFixed(2),
      Unit: item.unit || 'units',
      'Total Amount': item.totalAmount.toFixed(2),
      'Avg Price': item.avgPrice.toFixed(2),
      'Order Count': item.orderCount
    }));
    downloadExcel(data, 'PO_Top_Items', 'Top Items');
  };

  const downloadSuppliers = () => {
    const data = analytics.ordersBySupplier.map((s, idx) => ({
      Rank: idx + 1,
      Supplier: s.supplier,
      'Order Count': s.count,
      'Total Amount': s.amount.toFixed(2)
    }));
    downloadExcel(data, 'PO_Suppliers', 'Suppliers');
  };

  const downloadMarketItems = () => {
    const data = analytics.marketItems.items.map((item, idx) => ({
      Rank: idx + 1,
      'Item Name': item.item_name,
      'Item Code': item.item_code || '-',
      'Total Quantity': item.totalQuantity.toFixed(2),
      Unit: item.unit || 'units',
      'Total Amount': item.totalAmount.toFixed(2),
      'Avg Price': item.avgPrice.toFixed(2),
      'Order Count': item.orderCount
    }));
    downloadExcel(data, 'PO_Market_Items', 'Market Items');
  };

  const downloadMaterialItems = () => {
    const data = analytics.materialItems.items.map((item, idx) => ({
      Rank: idx + 1,
      'Item Name': item.item_name,
      'Item Code': item.item_code || '-',
      'Total Quantity': item.totalQuantity.toFixed(2),
      Unit: item.unit || 'units',
      'Total Amount': item.totalAmount.toFixed(2),
      'Avg Price': item.avgPrice.toFixed(2),
      'Order Count': item.orderCount
    }));
    downloadExcel(data, 'PO_Material_Items', 'Material Items');
  };

  const downloadAllItems = () => {
    const allItems = [...analytics.marketItems.items, ...analytics.materialItems.items, 
      ...analytics.topItems.filter(i => i.category === 'unknown')];
    const uniqueItems = Array.from(new Map(allItems.map(item => [item.item_name, item])).values());
    const data = uniqueItems.sort((a, b) => b.totalAmount - a.totalAmount).map((item, idx) => ({
      Rank: idx + 1,
      'Item Name': item.item_name,
      'Item Code': item.item_code || '-',
      Category: item.category === 'market' ? 'Market' : item.category === 'material' ? 'Material' : 'Other',
      'Total Quantity': item.totalQuantity.toFixed(2),
      Unit: item.unit || 'units',
      'Total Amount': item.totalAmount.toFixed(2),
      'Avg Price': item.avgPrice.toFixed(2),
      'Order Count': item.orderCount
    }));
    downloadExcel(data, 'PO_All_Items', 'All Items');
  };

  const downloadOrdersByDate = () => {
    const data = analytics.ordersByDate.slice().reverse().map(d => ({
      Date: format(parseISO(d.date), 'yyyy-MM-dd'),
      Day: format(parseISO(d.date), 'EEEE'),
      'Order Count': d.count,
      'Total Amount': d.amount.toFixed(2),
      'Avg per Order': (d.amount / d.count).toFixed(2)
    }));
    downloadExcel(data, 'PO_Orders_By_Date', 'Orders By Date');
  };

  const downloadFullReport = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Overview sheet
      const overviewData = [
        { Metric: 'Total Orders', Value: analytics.totalOrders },
        { Metric: 'Total Spend', Value: analytics.totalAmount.toFixed(2) },
        { Metric: 'Average Order Value', Value: analytics.avgOrderValue.toFixed(2) },
        { Metric: 'Daily Average', Value: analytics.dailyAverage.toFixed(2) },
        { Metric: 'Unique Items', Value: analytics.uniqueItems },
        { Metric: 'Market Items Spend', Value: analytics.marketItems.amount.toFixed(2) },
        { Metric: 'Material Items Spend', Value: analytics.materialItems.amount.toFixed(2) },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overviewData), 'Overview');
      
      // Market items sheet
      const marketData = analytics.marketItems.items.map((item, idx) => ({
        Rank: idx + 1,
        'Item Name': item.item_name,
        'Item Code': item.item_code || '-',
        Qty: item.totalQuantity.toFixed(2),
        Unit: item.unit || 'units',
        Amount: item.totalAmount.toFixed(2),
        Orders: item.orderCount
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(marketData), 'Market Items');
      
      // Material items sheet
      const materialData = analytics.materialItems.items.map((item, idx) => ({
        Rank: idx + 1,
        'Item Name': item.item_name,
        'Item Code': item.item_code || '-',
        Qty: item.totalQuantity.toFixed(2),
        Unit: item.unit || 'units',
        Amount: item.totalAmount.toFixed(2),
        Orders: item.orderCount
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(materialData), 'Material Items');
      
      // Orders by date sheet
      const dateData = analytics.ordersByDate.slice().reverse().map(d => ({
        Date: format(parseISO(d.date), 'yyyy-MM-dd'),
        Day: format(parseISO(d.date), 'EEEE'),
        Orders: d.count,
        Amount: d.amount.toFixed(2)
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dateData), 'By Date');
      
      // Suppliers sheet
      const supplierData = analytics.ordersBySupplier.map((s, idx) => ({
        Rank: idx + 1,
        Supplier: s.supplier,
        Orders: s.count,
        Amount: s.amount.toFixed(2)
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(supplierData), 'Suppliers');
      
      XLSX.writeFile(wb, `PO_Full_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success('Downloaded full report');
    } catch (error) {
      toast.error('Failed to download report');
      console.error(error);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend, 
    color = "primary" 
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string; 
    icon: any; 
    trend?: number;
    color?: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-4 bg-gradient-to-br from-card to-muted/30 border-primary/20 hover:border-primary/40 transition-all">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend !== undefined && (
              <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(trend).toFixed(1)}% vs last period
              </div>
            )}
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </Card>
    </motion.div>
  );

  const ItemRow = ({ item, index, formatCurrency }: { item: ItemSummary; index: number; formatCurrency: (n: number) => string }) => (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-xs text-muted-foreground font-mono w-6">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.item_name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {item.item_code && <span className="font-mono">{item.item_code}</span>}
            <span>{item.totalQuantity.toFixed(1)} {item.unit || 'units'}</span>
            <Badge 
              variant="outline" 
              className={`text-[10px] ${
                item.category === 'market' ? 'border-emerald-500 text-emerald-500' : 
                item.category === 'material' ? 'border-purple-500 text-purple-500' : 
                'border-muted-foreground'
              }`}
            >
              {item.category === 'market' ? 'Market' : item.category === 'material' ? 'Material' : 'Other'}
            </Badge>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-primary">{formatCurrency(item.totalAmount)}</p>
        <p className="text-xs text-muted-foreground">{item.orderCount} orders</p>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-4">
      {/* Download Full Report Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Purchase Order Analytics</h2>
        <Button onClick={downloadFullReport} size="sm" className="gap-2">
          <FileSpreadsheet className="w-4 h-4" />
          Download Full Report
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard 
          title="Total Orders" 
          value={analytics.totalOrders} 
          icon={ShoppingCart}
          subtitle={`${analytics.uniqueItems} unique items`}
        />
        <StatCard 
          title="Total Spend" 
          value={formatCurrency(analytics.totalAmount)}
          icon={DollarSign}
          trend={analytics.weeklyTrend}
        />
        <StatCard 
          title="Avg Order Value" 
          value={formatCurrency(analytics.avgOrderValue)}
          icon={BarChart3}
          subtitle={`Daily avg: ${formatCurrency(analytics.dailyAverage)}`}
        />
        <StatCard 
          title="This Month" 
          value={formatCurrency(analytics.monthlyComparison.current)}
          icon={Calendar}
          trend={analytics.monthlyComparison.change}
        />
      </div>

      {/* Category Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold text-emerald-600 dark:text-emerald-400">Market / Fresh Items</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={downloadMarketItems} className="h-7 px-2 gap-1 text-emerald-600">
              <Download className="w-3 h-3" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{analytics.marketItems.count}</p>
              <p className="text-xs text-muted-foreground">Unique Items</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(analytics.marketItems.amount)}</p>
              <p className="text-xs text-muted-foreground">Total Spend</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold text-purple-600 dark:text-purple-400">Materials / Supplies</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={downloadMaterialItems} className="h-7 px-2 gap-1 text-purple-600">
              <Download className="w-3 h-3" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{analytics.materialItems.count}</p>
              <p className="text-xs text-muted-foreground">Unique Items</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(analytics.materialItems.amount)}</p>
              <p className="text-xs text-muted-foreground">Total Spend</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview" className="text-xs">
            <BarChart3 className="w-3 h-3 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="market" className="text-xs">
            <Leaf className="w-3 h-3 mr-1" />
            Market
          </TabsTrigger>
          <TabsTrigger value="material" className="text-xs">
            <Wrench className="w-3 h-3 mr-1" />
            Material
          </TabsTrigger>
          <TabsTrigger value="combined" className="text-xs">
            <Layers className="w-3 h-3 mr-1" />
            All Items
          </TabsTrigger>
          <TabsTrigger value="dates" className="text-xs">
            <Calendar className="w-3 h-3 mr-1" />
            By Date
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Items */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Top Items by Spend
                </h3>
                <Button variant="ghost" size="sm" onClick={downloadTopItems} className="h-7 px-2 gap-1">
                  <Download className="w-3 h-3" />
                  <span className="text-xs">Export</span>
                </Button>
              </div>
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {analytics.topItems.slice(0, 10).map((item, idx) => (
                    <ItemRow key={item.item_name} item={item} index={idx} formatCurrency={formatCurrency} />
                  ))}
                </div>
              </ScrollArea>
            </Card>

            {/* Suppliers */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Top Suppliers
                </h3>
                <Button variant="ghost" size="sm" onClick={downloadSuppliers} className="h-7 px-2 gap-1">
                  <Download className="w-3 h-3" />
                  <span className="text-xs">Export</span>
                </Button>
              </div>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {analytics.ordersBySupplier.slice(0, 10).map((supplier, idx) => (
                    <motion.div
                      key={supplier.supplier}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground font-mono w-6">{idx + 1}</span>
                        <div>
                          <p className="text-sm font-medium">{supplier.supplier}</p>
                          <p className="text-xs text-muted-foreground">{supplier.count} orders</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-primary">{formatCurrency(supplier.amount)}</p>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="market" className="mt-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-500" />
                Market / Fresh Items
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-emerald-500 text-emerald-500">
                  {analytics.marketItems.count} items • {formatCurrency(analytics.marketItems.amount)}
                </Badge>
                <Button variant="ghost" size="sm" onClick={downloadMarketItems} className="h-7 px-2 gap-1">
                  <Download className="w-3 h-3" />
                  <span className="text-xs">Export</span>
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[400px]">
              {analytics.marketItems.items.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No market items found</p>
              ) : (
                <div className="space-y-1">
                  {analytics.marketItems.items.map((item, idx) => (
                    <ItemRow key={item.item_name} item={item} index={idx} formatCurrency={formatCurrency} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="material" className="mt-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Wrench className="w-4 h-4 text-purple-500" />
                Materials / Supplies
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-purple-500 text-purple-500">
                  {analytics.materialItems.count} items • {formatCurrency(analytics.materialItems.amount)}
                </Badge>
                <Button variant="ghost" size="sm" onClick={downloadMaterialItems} className="h-7 px-2 gap-1">
                  <Download className="w-3 h-3" />
                  <span className="text-xs">Export</span>
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[400px]">
              {analytics.materialItems.items.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No material items found</p>
              ) : (
                <div className="space-y-1">
                  {analytics.materialItems.items.map((item, idx) => (
                    <ItemRow key={item.item_name} item={item} index={idx} formatCurrency={formatCurrency} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="combined" className="mt-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                All Items Combined
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {analytics.uniqueItems} items • {formatCurrency(analytics.totalAmount)}
                </Badge>
                <Button variant="ghost" size="sm" onClick={downloadAllItems} className="h-7 px-2 gap-1">
                  <Download className="w-3 h-3" />
                  <span className="text-xs">Export</span>
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {analytics.topItems.map((item, idx) => (
                  <ItemRow key={item.item_name} item={item} index={idx} formatCurrency={formatCurrency} />
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="dates" className="mt-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Orders by Date
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {analytics.ordersByDate.length} days with orders
                </Badge>
                <Button variant="ghost" size="sm" onClick={downloadOrdersByDate} className="h-7 px-2 gap-1">
                  <Download className="w-3 h-3" />
                  <span className="text-xs">Export</span>
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {analytics.ordersByDate.slice().reverse().map((dayData, idx) => (
                  <motion.div
                    key={dayData.date}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[60px]">
                        <p className="text-lg font-bold text-primary">{format(parseISO(dayData.date), 'd')}</p>
                        <p className="text-xs text-muted-foreground">{format(parseISO(dayData.date), 'MMM yyyy')}</p>
                      </div>
                      <div className="h-10 w-px bg-border" />
                      <div>
                        <p className="text-sm font-medium">{format(parseISO(dayData.date), 'EEEE')}</p>
                        <p className="text-xs text-muted-foreground">{dayData.count} order{dayData.count > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{formatCurrency(dayData.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        Avg: {formatCurrency(dayData.amount / dayData.count)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Footer */}
      <Card className="p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Total Orders</p>
              <p className="text-xl font-bold text-primary">{analytics.totalOrders}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Total Items Qty</p>
              <p className="text-xl font-bold text-foreground">{analytics.totalItems.toFixed(0)}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">Grand Total</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(analytics.totalAmount)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
              <Leaf className="w-3 h-3 mr-1" />
              Market: {formatCurrency(analytics.marketItems.amount)}
            </Badge>
            <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">
              <Wrench className="w-3 h-3 mr-1" />
              Material: {formatCurrency(analytics.materialItems.amount)}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};
