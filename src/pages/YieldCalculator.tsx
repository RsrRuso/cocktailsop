import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Percent, Save, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface YieldCalculation {
  id: string;
  ingredient: string;
  rawWeight: number;
  preparedWeight: number;
  yieldPercentage: number;
  wastage: number;
  costPerLb: number;
  usableCost: number;
  unit: string;
  savedToSpirits: boolean;
}

const YieldCalculator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [calculations, setCalculations] = useState<YieldCalculation[]>([]);
  const [ingredient, setIngredient] = useState("");
  const [rawWeight, setRawWeight] = useState("");
  const [preparedWeight, setPreparedWeight] = useState("");
  const [unit, setUnit] = useState("lbs");
  const [costPerLb, setCostPerLb] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleCalculate = () => {
    if (!ingredient || !rawWeight || !preparedWeight || !costPerLb) {
      toast.error("Please fill in all fields");
      return;
    }

    const raw = parseFloat(rawWeight);
    const prepared = parseFloat(preparedWeight);
    const cost = parseFloat(costPerLb);

    if (prepared > raw) {
      toast.error("Prepared weight cannot exceed raw weight");
      return;
    }

    const yieldPercentage = (prepared / raw) * 100;
    const wastage = raw - prepared;
    const usableCost = cost / (yieldPercentage / 100);

    const newCalc: YieldCalculation = {
      id: Date.now().toString(),
      ingredient,
      rawWeight: raw,
      preparedWeight: prepared,
      yieldPercentage,
      wastage,
      costPerLb: cost,
      usableCost,
      unit,
      savedToSpirits: false
    };

    setCalculations([newCalc, ...calculations]);
    
    setIngredient("");
    setRawWeight("");
    setPreparedWeight("");
    setCostPerLb("");
    
    toast.success("Yield calculated");
  };

  const handleSaveToSpirits = async (calc: YieldCalculation) => {
    if (!user) {
      toast.error("Please sign in to save to spirits list");
      return;
    }

    setSavingId(calc.id);

    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from('master_spirits')
        .select('id')
        .eq('name', calc.ingredient)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        toast.error("This ingredient already exists in your spirits list");
        setSavingId(null);
        return;
      }

      // Convert to ml for bottle_size_ml
      let bottleSizeMl = 1000; // Default 1L
      if (calc.unit === 'lbs') bottleSizeMl = 1000;
      else if (calc.unit === 'kg') bottleSizeMl = 1000;
      else if (calc.unit === 'oz') bottleSizeMl = 1000;
      else if (calc.unit === 'g') bottleSizeMl = 1000;

      const { error } = await supabase.from('master_spirits').insert({
        name: calc.ingredient,
        category: 'Yield Product',
        bottle_size_ml: bottleSizeMl,
        source_type: 'yield_calculator',
        yield_percentage: calc.yieldPercentage,
        cost_per_unit: calc.usableCost,
        unit: calc.unit,
        user_id: user.id
      });

      if (error) throw error;

      // Update local state
      setCalculations(calculations.map(c => 
        c.id === calc.id ? { ...c, savedToSpirits: true } : c
      ));

      toast.success(`${calc.ingredient} added to Master Spirits list!`);
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = (id: string) => {
    setCalculations(calculations.filter(c => c.id !== id));
    toast.success("Calculation removed");
  };

  const averageYield = calculations.length > 0
    ? calculations.reduce((sum, calc) => sum + calc.yieldPercentage, 0) / calculations.length
    : 0;

  const getYieldStatus = (yieldPercentage: number) => {
    if (yieldPercentage >= 85) return { color: 'text-green-500', label: 'Excellent', bg: 'bg-green-500/10', border: 'border-green-500/20' };
    if (yieldPercentage >= 70) return { color: 'text-yellow-500', label: 'Good', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
    return { color: 'text-red-500', label: 'Poor', bg: 'bg-red-500/10', border: 'border-red-500/20' };
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6 max-w-4xl mx-auto">
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
              Yield Calculator
            </h1>
            <p className="text-muted-foreground">
              Calculate usable yield & true ingredient costs
            </p>
          </div>
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Calculate Yield</CardTitle>
            <CardDescription>Determine actual usable product after prep and waste</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Ingredient</label>
              <Input
                placeholder="e.g., Fresh Limes"
                value={ingredient}
                onChange={(e) => setIngredient(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Raw Weight</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="10"
                  value={rawWeight}
                  onChange={(e) => setRawWeight(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Prepared Weight</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="6.5"
                  value={preparedWeight}
                  onChange={(e) => setPreparedWeight(e.target.value)}
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
                    <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                    <SelectItem value="oz">Ounces (oz)</SelectItem>
                    <SelectItem value="g">Grams (g)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Cost per {unit} ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="4.50"
                  value={costPerLb}
                  onChange={(e) => setCostPerLb(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleCalculate} className="w-full">
              Calculate Yield
            </Button>
          </CardContent>
        </Card>

        {calculations.length > 0 && (
          <>
            <Card className="glass">
              <CardHeader>
                <CardTitle>Average Yield</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Overall Performance</span>
                  </div>
                  <span className={`text-3xl font-bold ${getYieldStatus(averageYield).color}`}>
                    {averageYield.toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Yield Calculations</h3>
              {calculations.map((calc) => {
                const status = getYieldStatus(calc.yieldPercentage);
                return (
                  <Card key={calc.id} className={`glass border ${status.border}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-lg">{calc.ingredient}</h4>
                            {calc.savedToSpirits && (
                              <Badge variant="secondary" className="gap-1">
                                <Check className="h-3 w-3" />
                                Saved
                              </Badge>
                            )}
                          </div>
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${status.bg} mt-1`}>
                            <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-3xl font-bold ${status.color}`}>
                            {calc.yieldPercentage.toFixed(1)}%
                          </div>
                          <span className="text-xs text-muted-foreground">Yield</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Raw Weight:</span>
                            <div className="font-medium">{calc.rawWeight} {calc.unit}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Prepared Weight:</span>
                            <div className="font-medium">{calc.preparedWeight} {calc.unit}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Wastage:</span>
                            <div className="font-medium text-red-500">{calc.wastage.toFixed(2)} {calc.unit}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cost per {calc.unit}:</span>
                            <div className="font-medium">${calc.costPerLb.toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-border/50">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">True Usable Cost per {calc.unit}:</span>
                            <span className="text-lg font-bold text-primary">
                              ${calc.usableCost.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Actual cost accounting for wastage: +${(calc.usableCost - calc.costPerLb).toFixed(2)} per {calc.unit}
                          </p>
                        </div>

                        <div className="flex gap-2 pt-3">
                          {!calc.savedToSpirits && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 gap-2"
                              onClick={() => handleSaveToSpirits(calc)}
                              disabled={savingId === calc.id}
                            >
                              <Save className="h-4 w-4" />
                              {savingId === calc.id ? "Saving..." : "Save to Spirits List"}
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(calc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

export default YieldCalculator;
