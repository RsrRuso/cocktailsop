import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface InventoryItem {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalValue: number;
}

const InventoryValuationReport = () => {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("bottles");
  const [costPerUnit, setCostPerUnit] = useState("");

  const handleAddItem = () => {
    if (!name || !category || !quantity || !costPerUnit) {
      toast.error("Please fill in all fields");
      return;
    }

    const qty = parseFloat(quantity);
    const cost = parseFloat(costPerUnit);
    const totalValue = qty * cost;

    setInventory([...inventory, {
      name,
      category,
      quantity: qty,
      unit,
      costPerUnit: cost,
      totalValue
    }]);

    setName("");
    setCategory("");
    setQuantity("");
    setCostPerUnit("");
    toast.success("Item added to inventory");
  };

  const generatePDF = () => {
    if (inventory.length === 0) {
      toast.error("Add some inventory first");
      return;
    }

    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Inventory Valuation Report", 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    
    const totalValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);
    const totalItems = inventory.length;
    const byCategory = inventory.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.totalValue;
      return acc;
    }, {} as Record<string, number>);
    
    doc.setFontSize(12);
    doc.text("Summary", 14, 38);
    doc.setFontSize(10);
    doc.text(`Total Inventory Value: $${totalValue.toFixed(2)}`, 14, 45);
    doc.text(`Total Items: ${totalItems}`, 14, 51);
    
    let yPos = 60;
    doc.text("Value by Category:", 14, yPos);
    yPos += 6;
    Object.entries(byCategory).forEach(([cat, val]) => {
      doc.text(`  ${cat}: $${val.toFixed(2)}`, 14, yPos);
      yPos += 5;
    });
    
    autoTable(doc, {
      startY: yPos + 5,
      head: [['Item', 'Category', 'Quantity', 'Cost/Unit', 'Total Value']],
      body: inventory.map(item => [
        item.name,
        item.category,
        `${item.quantity} ${item.unit}`,
        `$${item.costPerUnit.toFixed(2)}`,
        `$${item.totalValue.toFixed(2)}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] }
    });
    
    doc.save(`inventory-valuation-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("Report downloaded");
  };

  const totalValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);

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
              Inventory Valuation
            </h1>
            <p className="text-muted-foreground">
              Complete inventory value assessment
            </p>
          </div>
          {inventory.length > 0 && (
            <Button onClick={generatePDF} className="gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          )}
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Add Inventory Item</CardTitle>
            <CardDescription>Record current stock and valuation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Item Name</label>
                <Input
                  placeholder="e.g., Premium Vodka"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Input
                  placeholder="e.g., Spirits"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Quantity</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="24"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Unit</label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottles">Bottles</SelectItem>
                    <SelectItem value="cases">Cases</SelectItem>
                    <SelectItem value="kegs">Kegs</SelectItem>
                    <SelectItem value="liters">Liters</SelectItem>
                  </SelectContent>
                </Select>
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
              Add Item
            </Button>
          </CardContent>
        </Card>

        {inventory.length > 0 && (
          <>
            <Card className="glass">
              <CardHeader>
                <CardTitle>Total Valuation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-6 rounded-lg bg-primary/10 border border-primary/20 text-center">
                  <div className="text-sm text-muted-foreground mb-2">Total Inventory Value</div>
                  <div className="text-4xl font-bold text-primary">${totalValue.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground mt-2">{inventory.length} items</div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle>Inventory Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {inventory.map((item, index) => (
                    <div key={index} className="p-4 rounded-lg bg-muted/50 border">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {item.category} • {item.quantity} {item.unit} @ ${item.costPerUnit.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">${item.totalValue.toFixed(2)}</div>
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

export default InventoryValuationReport;