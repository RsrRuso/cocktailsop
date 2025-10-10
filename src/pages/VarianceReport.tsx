import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface VarianceData {
  item: string;
  expectedUsage: number;
  actualUsage: number;
  variance: number;
  variancePercent: number;
  costImpact: number;
  unit: string;
}

const VarianceReport = () => {
  const navigate = useNavigate();
  const [variances, setVariances] = useState<VarianceData[]>([]);
  const [item, setItem] = useState("");
  const [expectedUsage, setExpectedUsage] = useState("");
  const [actualUsage, setActualUsage] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");

  const handleAddItem = () => {
    if (!item || !expectedUsage || !actualUsage || !costPerUnit) {
      toast.error("Please fill in all fields");
      return;
    }

    const expected = parseFloat(expectedUsage);
    const actual = parseFloat(actualUsage);
    const cost = parseFloat(costPerUnit);
    const variance = actual - expected;
    const variancePercent = (variance / expected) * 100;
    const costImpact = variance * cost;

    setVariances([...variances, {
      item,
      expectedUsage: expected,
      actualUsage: actual,
      variance,
      variancePercent,
      costImpact,
      unit: "units"
    }]);

    setItem("");
    setExpectedUsage("");
    setActualUsage("");
    setCostPerUnit("");
    toast.success("Variance added to report");
  };

  const generatePDF = () => {
    if (variances.length === 0) {
      toast.error("Add some variance data first");
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Inventory Variance Report", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    
    const totalCostImpact = variances.reduce((sum, item) => sum + item.costImpact, 0);
    const overages = variances.filter(v => v.variance > 0).length;
    const shortages = variances.filter(v => v.variance < 0).length;
    
    doc.setFontSize(12);
    doc.text("Summary", 14, 38);
    doc.setFontSize(10);
    doc.text(`Total Cost Impact: $${Math.abs(totalCostImpact).toFixed(2)}`, 14, 45);
    doc.text(`Items Over: ${overages}`, 14, 51);
    doc.text(`Items Under: ${shortages}`, 14, 57);
    
    (doc as any).autoTable({
      startY: 65,
      head: [['Item', 'Expected', 'Actual', 'Variance', 'Variance %', 'Cost Impact']],
      body: variances.map(item => [
        item.item,
        item.expectedUsage.toFixed(2),
        item.actualUsage.toFixed(2),
        item.variance.toFixed(2),
        `${item.variancePercent.toFixed(1)}%`,
        `$${item.costImpact.toFixed(2)}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] }
    });
    
    doc.save(`variance-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("Report downloaded");
  };

  const totalCostImpact = variances.reduce((sum, item) => sum + Math.abs(item.costImpact), 0);

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/ops-tools")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gradient-primary">
              Variance Report
            </h1>
            <p className="text-muted-foreground">
              Track expected vs actual usage
            </p>
          </div>
          {variances.length > 0 && (
            <Button onClick={generatePDF} className="gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          )}
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Add Variance Data</CardTitle>
            <CardDescription>Compare expected vs actual usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Item Name</label>
              <Input
                placeholder="e.g., Gin - London Dry"
                value={item}
                onChange={(e) => setItem(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Expected Usage</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="10.00"
                  value={expectedUsage}
                  onChange={(e) => setExpectedUsage(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Actual Usage</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="12.50"
                  value={actualUsage}
                  onChange={(e) => setActualUsage(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Cost/Unit ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="35.00"
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleAddItem} className="w-full">
              Add Variance
            </Button>
          </CardContent>
        </Card>

        {variances.length > 0 && (
          <>
            <Card className="glass">
              <CardHeader>
                <CardTitle>Impact Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-6 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                  <div className="text-sm text-muted-foreground mb-2">Total Cost Impact</div>
                  <div className="text-4xl font-bold text-red-500">${totalCostImpact.toFixed(2)}</div>
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
                                {isOver ? 'Overage' : 'Under'}
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
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Expected:</span>
                            <div className="font-medium">{data.expectedUsage.toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Actual:</span>
                            <div className="font-medium">{data.actualUsage.toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cost Impact:</span>
                            <div className={`font-bold ${
                              isOver ? 'text-red-500' : 'text-blue-500'
                            }`}>
                              ${Math.abs(data.costImpact).toFixed(2)}
                            </div>
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