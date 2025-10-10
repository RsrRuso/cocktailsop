import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Calendar } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface SalesData {
  item: string;
  category: string;
  unitsSold: number;
  revenue: number;
  cost: number;
  profit: number;
}

const SalesReport = () => {
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<SalesData[]>([]);
  const [item, setItem] = useState("");
  const [category, setCategory] = useState("");
  const [unitsSold, setUnitsSold] = useState("");
  const [revenue, setRevenue] = useState("");
  const [cost, setCost] = useState("");

  const handleAddItem = () => {
    if (!item || !category || !unitsSold || !revenue || !cost) {
      toast.error("Please fill in all fields");
      return;
    }

    const units = parseFloat(unitsSold);
    const rev = parseFloat(revenue);
    const cst = parseFloat(cost);
    const profit = rev - cst;

    setReportData([...reportData, {
      item,
      category,
      unitsSold: units,
      revenue: rev,
      cost: cst,
      profit
    }]);

    setItem("");
    setCategory("");
    setUnitsSold("");
    setRevenue("");
    setCost("");
    toast.success("Item added to report");
  };

  const generatePDF = () => {
    if (reportData.length === 0) {
      toast.error("Add some data first");
      return;
    }

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text("Sales Performance Report", 14, 20);
    
    // Date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    
    // Summary
    const totalRevenue = reportData.reduce((sum, item) => sum + item.revenue, 0);
    const totalCost = reportData.reduce((sum, item) => sum + item.cost, 0);
    const totalProfit = reportData.reduce((sum, item) => sum + item.profit, 0);
    const totalUnits = reportData.reduce((sum, item) => sum + item.unitsSold, 0);
    
    doc.setFontSize(12);
    doc.text("Summary", 14, 38);
    doc.setFontSize(10);
    doc.text(`Total Revenue: $${totalRevenue.toFixed(2)}`, 14, 45);
    doc.text(`Total Cost: $${totalCost.toFixed(2)}`, 14, 51);
    doc.text(`Total Profit: $${totalProfit.toFixed(2)}`, 14, 57);
    doc.text(`Total Units Sold: ${totalUnits}`, 14, 63);
    doc.text(`Profit Margin: ${((totalProfit / totalRevenue) * 100).toFixed(1)}%`, 14, 69);
    
    // Table
    autoTable(doc, {
      startY: 78,
      head: [['Item', 'Category', 'Units', 'Revenue', 'Cost', 'Profit']],
      body: reportData.map(item => [
        item.item,
        item.category,
        item.unitsSold.toString(),
        `$${item.revenue.toFixed(2)}`,
        `$${item.cost.toFixed(2)}`,
        `$${item.profit.toFixed(2)}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] }
    });
    
    doc.save(`sales-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("Report downloaded");
  };

  const totalRevenue = reportData.reduce((sum, item) => sum + item.revenue, 0);
  const totalProfit = reportData.reduce((sum, item) => sum + item.profit, 0);

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
              Sales Report
            </h1>
            <p className="text-muted-foreground">
              Comprehensive sales performance analysis
            </p>
          </div>
          {reportData.length > 0 && (
            <Button onClick={generatePDF} className="gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          )}
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Add Sales Data</CardTitle>
            <CardDescription>Enter item sales information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Item Name</label>
                <Input
                  placeholder="e.g., Mojito"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Input
                  placeholder="e.g., Cocktails"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Units Sold</label>
                <Input
                  type="number"
                  placeholder="150"
                  value={unitsSold}
                  onChange={(e) => setUnitsSold(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Revenue ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="1500.00"
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Cost ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="375.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleAddItem} className="w-full">
              Add Item
            </Button>
          </CardContent>
        </Card>

        {reportData.length > 0 && (
          <>
            <Card className="glass">
              <CardHeader>
                <CardTitle>Report Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="text-sm text-muted-foreground mb-1">Total Revenue</div>
                  <div className="text-2xl font-bold text-primary">${totalRevenue.toFixed(2)}</div>
                </div>
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="text-sm text-muted-foreground mb-1">Total Profit</div>
                  <div className="text-2xl font-bold text-green-500">${totalProfit.toFixed(2)}</div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle>Sales Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {reportData.map((data, index) => (
                    <div key={index} className="p-4 rounded-lg bg-muted/50 border">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{data.item}</h4>
                          <p className="text-sm text-muted-foreground">{data.category}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-500">${data.profit.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">{data.unitsSold} units</div>
                        </div>
                      </div>
                    </div>
                  ))}
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

export default SalesReport;