import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface AuditItem {
  id: string;
  itemId: string;
  name: string;
  expectedQty: number;
  actualQty: number;
  unit: string;
  value: number;
  variance: number;
  varianceValue: number;
  status: 'match' | 'over' | 'under';
}

const StockAudit = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [masterItems, setMasterItems] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [expectedQty, setExpectedQty] = useState("");
  const [actualQty, setActualQty] = useState("");
  const [unit, setUnit] = useState("bottles");
  const [unitValue, setUnitValue] = useState("");

  useEffect(() => {
    if (user) {
      fetchMasterItems();
    }
  }, [user, currentWorkspace]);

  const fetchMasterItems = async () => {
    try {
      const workspaceFilter = currentWorkspace 
        ? { workspace_id: currentWorkspace.id }
        : { user_id: user?.id, workspace_id: null };

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .match(workspaceFilter)
        .order('name', { ascending: true });

      if (error) throw error;
      setMasterItems(data || []);
    } catch (error) {
      console.error('Error fetching master items:', error);
      toast.error('Failed to load items');
    }
  };

  const handleAddItem = () => {
    if (!selectedItemId || !expectedQty || !actualQty || !unitValue) {
      toast.error("Please fill in all fields");
      return;
    }

    const selectedItem = masterItems.find(item => item.id === selectedItemId);
    if (!selectedItem) return;

    const expected = parseFloat(expectedQty);
    const actual = parseFloat(actualQty);
    const value = parseFloat(unitValue);
    const variance = actual - expected;
    const varianceValue = variance * value;

    let status: 'match' | 'over' | 'under' = 'match';
    if (variance > 0) status = 'over';
    if (variance < 0) status = 'under';

    const newItem: AuditItem = {
      id: Date.now().toString(),
      itemId: selectedItemId,
      name: selectedItem.name,
      expectedQty: expected,
      actualQty: actual,
      unit,
      value,
      variance,
      varianceValue,
      status
    };

    setAuditItems([...auditItems, newItem]);
    
    setSelectedItemId("");
    setExpectedQty("");
    setActualQty("");
    setUnitValue("");
    
    toast.success("Item added to audit");
  };

  const totalVarianceValue = auditItems.reduce((sum, item) => sum + item.varianceValue, 0);
  const matchCount = auditItems.filter(item => item.status === 'match').length;
  const overCount = auditItems.filter(item => item.status === 'over').length;
  const underCount = auditItems.filter(item => item.status === 'under').length;

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
              Stock Audit
            </h1>
            <p className="text-muted-foreground">
              Physical inventory count & variance analysis
            </p>
          </div>
        </div>

        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Add Audit Item</CardTitle>
                <CardDescription>Compare expected vs actual inventory levels</CardDescription>
              </div>
              {masterItems.length === 0 && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate('/master-items')}
                >
                  Add Master Items
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Item</label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose from master items..." />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {masterItems.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No items found. Add items in Master Items first.
                    </div>
                  ) : (
                    masterItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} {item.brand && `- ${item.brand}`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Expected Quantity</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="10"
                  value={expectedQty}
                  onChange={(e) => setExpectedQty(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Actual Count</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="9.5"
                  value={actualQty}
                  onChange={(e) => setActualQty(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="gallons">Gallons</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Value per Unit ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="35.00"
                  value={unitValue}
                  onChange={(e) => setUnitValue(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleAddItem} className="w-full">
              Add to Audit
            </Button>
          </CardContent>
        </Card>

        {auditItems.length > 0 && (
          <>
            <Card className="glass">
              <CardHeader>
                <CardTitle>Audit Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`p-4 rounded-lg border ${
                  totalVarianceValue === 0 ? 'bg-green-500/10 border-green-500/20' :
                  totalVarianceValue > 0 ? 'bg-blue-500/10 border-blue-500/20' :
                  'bg-red-500/10 border-red-500/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total Variance Value</span>
                    <span className={`text-2xl font-bold ${
                      totalVarianceValue === 0 ? 'text-green-500' :
                      totalVarianceValue > 0 ? 'text-blue-500' : 'text-red-500'
                    }`}>
                      {totalVarianceValue >= 0 ? '+' : ''}${totalVarianceValue.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-green-500">{matchCount}</div>
                    <div className="text-xs text-muted-foreground">Match</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <AlertCircle className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-blue-500">{overCount}</div>
                    <div className="text-xs text-muted-foreground">Overage</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-red-500">{underCount}</div>
                    <div className="text-xs text-muted-foreground">Shortage</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Audit Items</h3>
              {auditItems.map((item) => {
                const StatusIcon = item.status === 'match' ? CheckCircle2 :
                                 item.status === 'over' ? AlertCircle : XCircle;
                const statusColor = item.status === 'match' ? 'text-green-500' :
                                  item.status === 'over' ? 'text-blue-500' : 'text-red-500';
                const bgColor = item.status === 'match' ? 'bg-green-500/10 border-green-500/20' :
                              item.status === 'over' ? 'bg-blue-500/10 border-blue-500/20' :
                              'bg-red-500/10 border-red-500/20';

                return (
                  <Card key={item.id} className={`glass border ${bgColor}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            ${item.value.toFixed(2)} per {item.unit}
                          </p>
                        </div>
                        <StatusIcon className={`w-5 h-5 ${statusColor}`} />
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Expected:</span>
                          <div className="font-medium">{item.expectedQty} {item.unit}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Actual:</span>
                          <div className="font-medium">{item.actualQty} {item.unit}</div>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Variance:</span>
                          <div className="text-right">
                            <div className={`font-bold ${statusColor}`}>
                              {item.variance >= 0 ? '+' : ''}{item.variance.toFixed(2)} {item.unit}
                            </div>
                            <div className={`text-sm font-medium ${statusColor}`}>
                              {item.varianceValue >= 0 ? '+' : ''}${item.varianceValue.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default StockAudit;