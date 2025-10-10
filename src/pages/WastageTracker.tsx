import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface WastageEntry {
  id: string;
  date: string;
  item: string;
  quantity: number;
  unit: string;
  cost: number;
  reason: string;
  totalCost: number;
}

const WastageTracker = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<WastageEntry[]>([]);
  const [item, setItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("oz");
  const [cost, setCost] = useState("");
  const [reason, setReason] = useState("");

  const handleAddEntry = () => {
    if (!item || !quantity || !cost || !reason) {
      toast.error("Please fill in all fields");
      return;
    }

    const qty = parseFloat(quantity);
    const costPerUnit = parseFloat(cost);
    const totalCost = qty * costPerUnit;

    const newEntry: WastageEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      item,
      quantity: qty,
      unit,
      cost: costPerUnit,
      reason,
      totalCost
    };

    setEntries([newEntry, ...entries]);
    
    setItem("");
    setQuantity("");
    setCost("");
    setReason("");
    
    toast.success("Wastage entry added");
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(entries.filter(entry => entry.id !== id));
    toast.success("Entry deleted");
  };

  const totalWastage = entries.reduce((sum, entry) => sum + entry.totalCost, 0);
  const wastageByReason = entries.reduce((acc, entry) => {
    acc[entry.reason] = (acc[entry.reason] || 0) + entry.totalCost;
    return acc;
  }, {} as Record<string, number>);

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
          <div>
            <h1 className="text-3xl font-bold text-gradient-primary">
              Wastage Tracker
            </h1>
            <p className="text-muted-foreground">
              Monitor and reduce operational waste
            </p>
          </div>
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Log Wastage</CardTitle>
            <CardDescription>Record waste to identify patterns and reduce costs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Item Name</label>
              <Input
                placeholder="e.g., Lime Juice"
                value={item}
                onChange={(e) => setItem(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Quantity</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="10"
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
                    <SelectItem value="oz">oz</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="bottles">bottles</SelectItem>
                    <SelectItem value="cases">cases</SelectItem>
                    <SelectItem value="lbs">lbs</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Cost per Unit ($)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="2.50"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Reason</label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Expired">Expired</SelectItem>
                  <SelectItem value="Spillage">Spillage</SelectItem>
                  <SelectItem value="Over-portioning">Over-portioning</SelectItem>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                  <SelectItem value="Contaminated">Contaminated</SelectItem>
                  <SelectItem value="Returned">Returned</SelectItem>
                  <SelectItem value="Prep Error">Prep Error</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddEntry} className="w-full">
              Log Wastage
            </Button>
          </CardContent>
        </Card>

        {entries.length > 0 && (
          <>
            <Card className="glass">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="font-medium">Total Wastage</span>
                  </div>
                  <span className="text-2xl font-bold text-red-500">
                    ${totalWastage.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Wastage by Reason</h4>
                  {Object.entries(wastageByReason).map(([reason, cost]) => (
                    <div key={reason} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{reason}</span>
                      <span className="font-medium">${cost.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Recent Entries</h3>
              {entries.map((entry) => (
                <Card key={entry.id} className="glass">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{entry.item}</h4>
                        <p className="text-sm text-muted-foreground">{entry.date}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteEntry(entry.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quantity:</span>
                        <span>{entry.quantity} {entry.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cost per unit:</span>
                        <span>${entry.cost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reason:</span>
                        <span>{entry.reason}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-1 mt-2">
                        <span>Total Cost:</span>
                        <span className="text-red-500">${entry.totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default WastageTracker;