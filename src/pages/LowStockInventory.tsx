import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Download, Package } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface LowStockItem {
  id: string;
  quantity: number;
  expiration_date: string;
  item_id: string;
  items: { name: string; category: string } | null;
  stores: { name: string } | null;
}

interface ItemAverage {
  itemId: string;
  avgQuantity: number;
}

interface Workspace {
  id: string;
  name: string;
}

const LowStockInventory = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [itemAverages, setItemAverages] = useState<Record<string, number>>({});
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspaceAndItems();
    }
  }, [workspaceId]);

  const fetchWorkspaceAndItems = async () => {
    if (!workspaceId || workspaceId === 'null' || workspaceId === 'undefined') {
      toast.error("Invalid workspace ID");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: workspaceData, error: workspaceError } = await supabase
        .from("workspaces")
        .select("id, name")
        .eq("id", workspaceId)
        .single();

      if (workspaceError) throw workspaceError;
      setWorkspace(workspaceData);

      const { data: settings } = await supabase
        .from("stock_alert_settings")
        .select("minimum_quantity_threshold")
        .eq("workspace_id", workspaceId)
        .single();

      const minimumQuantity = settings?.minimum_quantity_threshold || 10;

      const { data, error } = await supabase
        .from("inventory")
        .select(`
          id,
          quantity,
          expiration_date,
          item_id,
          items(name, category),
          stores(name)
        `)
        .eq("workspace_id", workspaceId)
        .lte("quantity", minimumQuantity)
        .order("quantity", { ascending: true });

      if (error) throw error;
      
      // Fetch all inventory for this workspace to calculate averages
      const { data: allInventoryData } = await supabase
        .from("inventory")
        .select("item_id, quantity")
        .eq("workspace_id", workspaceId);

      // Calculate average quantity per item across all stores
      const itemQuantities: Record<string, number[]> = {};
      allInventoryData?.forEach((inv: any) => {
        if (!itemQuantities[inv.item_id]) {
          itemQuantities[inv.item_id] = [];
        }
        itemQuantities[inv.item_id].push(inv.quantity);
      });

      const averages: Record<string, number> = {};
      Object.keys(itemQuantities).forEach(itemId => {
        const quantities = itemQuantities[itemId];
        averages[itemId] = quantities.reduce((a, b) => a + b, 0) / quantities.length;
      });

      setItemAverages(averages);
      
      // Filter to only show glassware items
      const glasswareItems = (data || []).filter((item: any) => 
        item.items?.category?.toLowerCase() === 'glassware'
      );
      
      setLowStockItems(glasswareItems);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      toast.error("Failed to load low stock items");
    } finally {
      setLoading(false);
    }
  };

  const getStockLevel = (quantity: number, itemId: string) => {
    const avgQuantity = itemAverages[itemId] || 0;
    
    if (quantity === 0) {
      return { level: 'out', label: 'OUT OF STOCK', color: 'text-red-600 bg-red-100 dark:bg-red-900/30 border border-red-500/50' };
    }
    
    if (avgQuantity > 0 && quantity < avgQuantity * 0.25) {
      return { level: 'very-low', label: 'VERY LOW', color: 'text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-400/40' };
    }
    
    if (avgQuantity > 0 && quantity < avgQuantity * 0.5) {
      return { level: 'low', label: 'LOW', color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20 border border-orange-400/40' };
    }
    
    return { level: 'warning', label: 'WARNING', color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400/40' };
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.setTextColor(220, 38, 38);
      doc.text("Low Stock Inventory Report (Glassware)", 14, 20);

      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Workspace: ${workspace?.name || "Unknown"}`, 14, 30);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37);

      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(`Total Low Stock Items: ${lowStockItems.length}`, 14, 47);

      const tableData = lowStockItems.map((item, index) => {
        const stockLevel = getStockLevel(item.quantity, item.item_id);
        return [
          index + 1,
          item.items?.name || "Unknown",
          item.stores?.name || "Unknown",
          item.quantity,
          stockLevel.label,
          new Date(item.expiration_date).toLocaleDateString(),
        ];
      });

      autoTable(doc, {
        startY: 55,
        head: [["#", "Item", "Store", "Quantity", "Status", "Expires"]],
        body: tableData,
        theme: "striped",
        headStyles: {
          fillColor: [220, 38, 38],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        styles: {
          fontSize: 10,
          cellPadding: 5,
        },
        columnStyles: {
          0: { cellWidth: 12 },
          1: { cellWidth: 50 },
          2: { cellWidth: 35 },
          3: { cellWidth: 20 },
          4: { cellWidth: 28 },
          5: { cellWidth: 30 },
        },
      });

      const fileName = `low-stock-inventory-${workspace?.name || "report"}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  if (!workspaceId) {
    return (
      <div className="min-h-screen bg-background pb-20 pt-16">
        <TopNav />
        <div className="px-4 py-6">
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">No workspace specified</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6 text-red-500" />
              Low Stock Inventory (Glassware)
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {workspace?.name || "Loading..."}
            </p>
          </div>
          {lowStockItems.length > 0 && (
            <Button onClick={exportToPDF} className="gap-2">
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
          )}
        </div>

        {loading ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : lowStockItems.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full glass-hover flex items-center justify-center">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">All Glassware Stock Levels Good</p>
              <p className="text-sm text-muted-foreground mt-1">
                No glassware items are running low on stock
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {lowStockItems.map((item, index) => {
              const stockLevel = getStockLevel(item.quantity, item.item_id);
              const avgQuantity = itemAverages[item.item_id] || 0;
              
              return (
                <div
                  key={item.id}
                  className={`glass rounded-xl p-4 hover:glass-hover transition-all ${
                    stockLevel.level === 'very-low' || stockLevel.level === 'out' 
                      ? 'border-2 border-red-500/50' 
                      : stockLevel.level === 'low'
                        ? 'border border-orange-500/40'
                        : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-muted-foreground">
                          #{index + 1}
                        </span>
                        <h3 className="font-semibold">
                          {item.items?.name || "Unknown Item"}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${stockLevel.color}`}>
                          {stockLevel.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Store:</span>{" "}
                          <span className="font-medium">
                            {item.stores?.name || "Unknown"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Expires:</span>{" "}
                          <span className="font-medium">
                            {new Date(item.expiration_date).toLocaleDateString()}
                          </span>
                        </div>
                        {avgQuantity > 0 && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Avg across stores:</span>{" "}
                            <span className="font-medium">
                              {avgQuantity.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${stockLevel.color}`}
                    >
                      Qty: {item.quantity}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default LowStockInventory;
