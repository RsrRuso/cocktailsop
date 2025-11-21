import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";

interface VarianceData {
  item: string;
  expectedQuantity: number;
  spotCheckQty: number;
  transferredQty: number;
  variance: number;
  variancePercent: number;
  finalQty: number;
  itemId: string;
}

const VarianceReport = () => {
  const navigate = useNavigate();
  const [variances, setVariances] = useState<VarianceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVarianceData();
  }, []);

  const fetchVarianceData = async () => {
    try {
      setLoading(true);
      const { data } = await (supabase as any).auth.getUser();
      const user = data?.user;
      if (!user) {
        setVariances([]);
        setLoading(false);
        return;
      }

      // Fetch spot check items with related data
      const { data: spotCheckItems, error: spotError } = await (supabase as any)
        .from("spot_check_items")
        .select(`
          *,
          items (name),
          inventory (quantity)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (spotError) throw spotError;

      if (!spotCheckItems || spotCheckItems.length === 0) {
        setVariances([]);
        setLoading(false);
        return;
      }

      // Fetch transfer data for these items (join through inventory to get item_id)
      const itemIds = spotCheckItems.map(item => item.item_id);
      const { data: transfers } = await supabase
        .from("inventory_transfers")
        .select(`
          quantity,
          status,
          inventory:inventory_id (
            item_id
          )
        `)
        .eq("status", "completed");

      // Calculate transferred quantities per item
      const transferredByItem = (transfers || []).reduce((acc, transfer) => {
        const itemId = (transfer.inventory as any)?.item_id;
        if (itemId && itemIds.includes(itemId)) {
          acc[itemId] = (acc[itemId] || 0) + (transfer.quantity || 0);
        }
        return acc;
      }, {} as Record<string, number>);

      // Build variance data
      const varianceData: VarianceData[] = spotCheckItems.map(item => {
        const expected = item.expected_quantity || 0;
        const actual = item.actual_quantity || 0;
        const transferred = transferredByItem[item.item_id] || 0;
        const variance = item.variance || 0;
        const variancePercent = expected > 0 ? (variance / expected) * 100 : 0;
        const finalQty = actual + transferred;

        return {
          item: item.items?.name || "Unknown Item",
          expectedQuantity: expected,
          spotCheckQty: actual,
          transferredQty: transferred,
          variance,
          variancePercent,
          finalQty,
          itemId: item.item_id
        };
      });

      setVariances(varianceData);
    } catch (error: any) {
      console.error("Error fetching variance data:", error);
      toast.error("Failed to load variance data");
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    if (variances.length === 0) {
      toast.error("No variance data to export");
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Inventory Variance Report", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    
    const totalVariance = variances.reduce((sum, item) => sum + Math.abs(item.variance), 0);
    const overages = variances.filter(v => v.variance > 0).length;
    const shortages = variances.filter(v => v.variance < 0).length;
    
    doc.setFontSize(12);
    doc.text("Summary", 14, 38);
    doc.setFontSize(10);
    doc.text(`Total Variance: ${totalVariance.toFixed(2)}`, 14, 45);
    doc.text(`Items Over: ${overages}`, 14, 51);
    doc.text(`Items Under: ${shortages}`, 14, 57);
    
    (doc as any).autoTable({
      startY: 65,
      head: [['Item', 'Expected', 'Spot Check', 'Transferred', 'Variance', 'Variance %', 'Final Qty']],
      body: variances.map(item => [
        item.item,
        item.expectedQuantity.toFixed(2),
        item.spotCheckQty.toFixed(2),
        item.transferredQty.toFixed(2),
        item.variance.toFixed(2),
        `${item.variancePercent.toFixed(1)}%`,
        item.finalQty.toFixed(2)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] }
    });
    
    doc.save(`variance-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("Report downloaded");
  };

  const totalVariance = variances.reduce((sum, item) => sum + Math.abs(item.variance), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 pt-16">
        <TopNav />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6">
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/ops-tools")}
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gradient-primary">
                Variance Report
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Track spot checks, transfers & variance
              </p>
            </div>
          </div>
          {variances.length > 0 && (
            <Button onClick={generatePDF} className="w-full sm:w-auto gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          )}
        </div>

        {variances.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No variance data available</p>
              <p className="text-sm text-muted-foreground mt-2">
                Complete spot checks to see variance reports
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="glass">
              <CardHeader>
                <CardTitle>Variance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-6 rounded-lg bg-primary/10 border border-primary/20 text-center">
                  <div className="text-sm text-muted-foreground mb-2">Total Variance</div>
                  <div className="text-4xl font-bold text-primary">{totalVariance.toFixed(2)}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle>Variance Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {variances.map((data, index) => {
                    const isOver = data.variance > 0;
                    return (
                      <div key={index} className={`p-4 rounded-lg border ${
                        isOver ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/10 border-blue-500/20'
                      }`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{data.item}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              {isOver ? (
                                <TrendingUp className="w-4 h-4 text-red-500" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-blue-500" />
                              )}
                              <span className={`text-sm font-medium ${
                                isOver ? 'text-red-500' : 'text-blue-500'
                              }`}>
                                {isOver ? 'Overage' : 'Shortage'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${
                              isOver ? 'text-red-500' : 'text-blue-500'
                            }`}>
                              {data.variance > 0 ? '+' : ''}{data.variance.toFixed(2)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {data.variancePercent.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground block">Expected:</span>
                            <div className="font-medium">{data.expectedQuantity.toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Spot Check:</span>
                            <div className="font-medium">{data.spotCheckQty.toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Transferred:</span>
                            <div className="font-medium">{data.transferredQty.toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Variance:</span>
                            <div className={`font-bold ${
                              isOver ? 'text-red-500' : 'text-blue-500'
                            }`}>
                              {data.variance.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground block">Final Qty:</span>
                            <div className="font-bold text-primary">{data.finalQty.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default VarianceReport;
