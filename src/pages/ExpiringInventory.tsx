import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Download, Package } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/useWorkspace";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExpiringItem {
  id: string;
  quantity: number;
  expiration_date: string;
  priority_score: number;
  items: { name: string } | null;
  stores: { name: string } | null;
}

const ExpiringInventory = () => {
  const [expiringItems, setExpiringItems] = useState<ExpiringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentWorkspace } = useWorkspace();

  useEffect(() => {
    fetchExpiringItems();
  }, [currentWorkspace]);

  const fetchExpiringItems = async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    try {
      // Get the workspace settings to know the days threshold
      const { data: settings } = await supabase
        .from("fifo_alert_settings")
        .select("days_before_expiry")
        .eq("workspace_id", currentWorkspace.id)
        .single();

      const daysBeforeExpiry = settings?.days_before_expiry || 30;
      const expiryThreshold = new Date();
      expiryThreshold.setDate(expiryThreshold.getDate() + daysBeforeExpiry);

      const { data, error } = await supabase
        .from("inventory")
        .select(`
          id,
          quantity,
          expiration_date,
          priority_score,
          items(name),
          stores(name)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .lte("expiration_date", expiryThreshold.toISOString().split('T')[0])
        .gte("quantity", 1)
        .order("priority_score", { ascending: false });

      if (error) throw error;
      setExpiringItems(data || []);
    } catch (error) {
      console.error("Error fetching expiring items:", error);
      toast.error("Failed to load expiring items");
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilExpiry = (expirationDate: string) => {
    return Math.ceil(
      (new Date(expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
  };

  const getExpiryColor = (days: number) => {
    if (days <= 7) return "text-red-500 bg-red-50 dark:bg-red-900/20";
    if (days <= 14) return "text-orange-500 bg-orange-50 dark:bg-orange-900/20";
    return "text-blue-500 bg-blue-50 dark:bg-blue-900/20";
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();

      // Title
      doc.setFontSize(20);
      doc.setTextColor(220, 38, 38);
      doc.text("Expiring Inventory Report", 14, 20);

      // Workspace name
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Workspace: ${currentWorkspace?.name || "Unknown"}`, 14, 30);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 37);

      // Summary
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(`Total Items Expiring: ${expiringItems.length}`, 14, 47);

      // Table data
      const tableData = expiringItems.map((item, index) => {
        const daysLeft = getDaysUntilExpiry(item.expiration_date);
        return [
          index + 1,
          item.items?.name || "Unknown",
          item.stores?.name || "Unknown",
          item.quantity,
          new Date(item.expiration_date).toLocaleDateString(),
          `${daysLeft} days`,
        ];
      });

      // Generate table
      autoTable(doc, {
        startY: 55,
        head: [["#", "Item", "Store", "Qty", "Expires", "Days Left"]],
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
          0: { cellWidth: 15 },
          1: { cellWidth: 50 },
          2: { cellWidth: 40 },
          3: { cellWidth: 20 },
          4: { cellWidth: 30 },
          5: { cellWidth: 25 },
        },
      });

      // Save PDF
      const fileName = `expiring-inventory-${currentWorkspace?.name || "report"}-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6 text-red-500" />
              Expiring Inventory
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {currentWorkspace?.name || "Select a workspace"}
            </p>
          </div>
          {expiringItems.length > 0 && (
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
        ) : expiringItems.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-full glass-hover flex items-center justify-center">
              <Package className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">No Expiring Items</p>
              <p className="text-sm text-muted-foreground mt-1">
                All inventory items are within safe expiry dates
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {expiringItems.map((item, index) => {
              const daysLeft = getDaysUntilExpiry(item.expiration_date);
              return (
                <div
                  key={item.id}
                  className="glass rounded-xl p-4 hover:glass-hover transition-all"
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
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Store:</span>{" "}
                          <span className="font-medium">
                            {item.stores?.name || "Unknown"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Quantity:</span>{" "}
                          <span className="font-medium">{item.quantity}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Expires:</span>{" "}
                          <span className="font-medium">
                            {new Date(item.expiration_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Priority:</span>{" "}
                          <span className="font-medium">{item.priority_score}</span>
                        </div>
                      </div>
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${getExpiryColor(
                        daysLeft
                      )}`}
                    >
                      {daysLeft} days
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

export default ExpiringInventory;
