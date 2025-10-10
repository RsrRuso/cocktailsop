import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Percent } from "lucide-react";
import { toast } from "sonner";

interface YieldCalculation {
  ingredient: string;
  rawWeight: number;
  preparedWeight: number;
  yieldPercentage: number;
  wastage: number;
  costPerLb: number;
  usableCost: number;
}

const YieldCalculator = () => {
  const navigate = useNavigate();
  const [calculations, setCalculations] = useState<YieldCalculation[]>([]);
  const [ingredient, setIngredient] = useState("");
  const [rawWeight, setRawWeight] = useState("");
  const [preparedWeight, setPreparedWeight] = useState("");
  const [unit, setUnit] = useState("lbs");
  const [costPerLb, setCostPerLb] = useState("");

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
      ingredient,
      rawWeight: raw,
      preparedWeight: prepared,
      yieldPercentage,
      wastage,
      costPerLb: cost,
      usableCost
    };

    setCalculations([newCalc, ...calculations]);
    
    setIngredient("");
    setRawWeight("");
    setPreparedWeight("");
    setCostPerLb("");
    
    toast.success("Yield calculated");
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
              {calculations.map((calc, index) => {
                const status = getYieldStatus(calc.yieldPercentage);
                return (
                  <Card key={index} className={`glass border ${status.border}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-lg">{calc.ingredient}</h4>
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
                            <div className="font-medium">{calc.rawWeight} {unit}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Prepared Weight:</span>
                            <div className="font-medium">{calc.preparedWeight} {unit}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Wastage:</span>
                            <div className="font-medium text-red-500">{calc.wastage.toFixed(2)} {unit}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cost per {unit}:</span>
                            <div className="font-medium">${calc.costPerLb.toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-border/50">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">True Usable Cost per {unit}:</span>
                            <span className="text-lg font-bold text-primary">
                              ${calc.usableCost.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Actual cost accounting for wastage: +${(calc.usableCost - calc.costPerLb).toFixed(2)} per {unit}
                          </p>
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