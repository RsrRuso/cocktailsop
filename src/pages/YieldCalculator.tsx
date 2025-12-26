import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Percent, Save, Check, Trash2, Beaker, Apple } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMasterSpirits } from "@/hooks/useMasterSpirits";

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
  mode: 'solid' | 'liquid';
  inputIngredients?: Array<{ name: string; amount: number; unit: string }>;
}

const YieldCalculator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { spirits } = useMasterSpirits();
  const [calculations, setCalculations] = useState<YieldCalculation[]>([]);
  const [activeTab, setActiveTab] = useState<'solid' | 'liquid'>('solid');
  
  // Solid mode state
  const [ingredient, setIngredient] = useState("");
  const [rawWeight, setRawWeight] = useState("");
  const [preparedWeight, setPreparedWeight] = useState("");
  const [unit, setUnit] = useState("kg");
  const [costPerLb, setCostPerLb] = useState("");
  
  // Liquid infusion mode state
  const [infusionName, setInfusionName] = useState("");
  const [liquidIngredients, setLiquidIngredients] = useState<Array<{ name: string; amount: string; unit: string }>>([
    { name: "", amount: "", unit: "ml" }
  ]);
  const [finalYieldMl, setFinalYieldMl] = useState("");
  const [totalCost, setTotalCost] = useState("");
  
  const [savingId, setSavingId] = useState<string | null>(null);

  // Solid ingredient calculation
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
      savedToSpirits: false,
      mode: 'solid'
    };

    setCalculations([newCalc, ...calculations]);
    
    setIngredient("");
    setRawWeight("");
    setPreparedWeight("");
    setCostPerLb("");
    
    toast.success("Yield calculated");
  };

  // Liquid infusion calculation
  const handleCalculateLiquid = () => {
    if (!infusionName || !finalYieldMl) {
      toast.error("Please enter infusion name and final yield");
      return;
    }

    const validIngredients = liquidIngredients.filter(ing => ing.name && ing.amount);
    if (validIngredients.length === 0) {
      toast.error("Please add at least one ingredient");
      return;
    }

    // Calculate total input ml (convert all to ml)
    const totalInputMl = validIngredients.reduce((sum, ing) => {
      let amountMl = parseFloat(ing.amount);
      if (ing.unit === 'L') amountMl *= 1000;
      else if (ing.unit === 'cl') amountMl *= 10;
      return sum + amountMl;
    }, 0);

    const finalMl = parseFloat(finalYieldMl);
    const cost = parseFloat(totalCost) || 0;

    if (finalMl > totalInputMl) {
      toast.error("Final yield cannot exceed total input volume");
      return;
    }

    const yieldPercentage = (finalMl / totalInputMl) * 100;
    const wastage = totalInputMl - finalMl;
    const costPerMl = cost > 0 ? cost / finalMl : 0;

    const newCalc: YieldCalculation = {
      id: Date.now().toString(),
      ingredient: infusionName,
      rawWeight: totalInputMl,
      preparedWeight: finalMl,
      yieldPercentage,
      wastage,
      costPerLb: cost,
      usableCost: costPerMl,
      unit: 'ml',
      savedToSpirits: false,
      mode: 'liquid',
      inputIngredients: validIngredients.map(ing => ({
        name: ing.name,
        amount: parseFloat(ing.amount),
        unit: ing.unit
      }))
    };

    setCalculations([newCalc, ...calculations]);
    
    setInfusionName("");
    setLiquidIngredients([{ name: "", amount: "", unit: "ml" }]);
    setFinalYieldMl("");
    setTotalCost("");
    
    toast.success("Infusion yield calculated");
  };

  const addLiquidIngredient = () => {
    setLiquidIngredients([...liquidIngredients, { name: "", amount: "", unit: "ml" }]);
  };

  const updateLiquidIngredient = (index: number, field: 'name' | 'amount' | 'unit', value: string) => {
    const updated = [...liquidIngredients];
    updated[index][field] = value;
    setLiquidIngredients(updated);
  };

  const removeLiquidIngredient = (index: number) => {
    if (liquidIngredients.length > 1) {
      setLiquidIngredients(liquidIngredients.filter((_, i) => i !== index));
    }
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

      // For liquid mode, use the final yield as bottle size
      const bottleSizeMl = calc.mode === 'liquid' ? calc.preparedWeight : 1000;

      const { error } = await supabase.from('master_spirits').insert({
        name: calc.ingredient,
        category: calc.mode === 'liquid' ? 'Infusion' : 'Yield Product',
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

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'solid' | 'liquid')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="solid" className="gap-2">
              <Apple className="h-4 w-4" />
              Solid Prep
            </TabsTrigger>
            <TabsTrigger value="liquid" className="gap-2">
              <Beaker className="h-4 w-4" />
              Liquid Infusion
            </TabsTrigger>
          </TabsList>

          <TabsContent value="solid" className="mt-4">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Calculate Solid Yield</CardTitle>
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
                        <SelectItem value="ml">Milliliters (ml)</SelectItem>
                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
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
          </TabsContent>

          <TabsContent value="liquid" className="mt-4">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Calculate Infusion Yield</CardTitle>
                <CardDescription>Track yield loss from infusions, macerations, and liquid preparations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Infusion Name</label>
                  <Input
                    placeholder="e.g., Sour Cherry Infused Vodka"
                    value={infusionName}
                    onChange={(e) => setInfusionName(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium block">Input Ingredients</label>
                  {liquidIngredients.map((ing, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Select
                        value={ing.name}
                        onValueChange={(v) => updateLiquidIngredient(index, 'name', v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select ingredient" />
                        </SelectTrigger>
                        <SelectContent>
                          {spirits?.map((spirit) => (
                            <SelectItem key={spirit.id} value={spirit.name}>
                              {spirit.name} {spirit.brand ? `(${spirit.brand})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={ing.amount}
                        onChange={(e) => updateLiquidIngredient(index, 'amount', e.target.value)}
                        className="w-24"
                      />
                      <Select 
                        value={ing.unit} 
                        onValueChange={(v) => updateLiquidIngredient(index, 'unit', v)}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ml">ml</SelectItem>
                          <SelectItem value="L">L</SelectItem>
                          <SelectItem value="cl">cl</SelectItem>
                        </SelectContent>
                      </Select>
                      {liquidIngredients.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLiquidIngredient(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addLiquidIngredient}>
                    + Add Ingredient
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Final Yield (ml)</label>
                    <Input
                      type="number"
                      placeholder="850"
                      value={finalYieldMl}
                      onChange={(e) => setFinalYieldMl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Actual output after straining/filtering
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Total Cost ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="25.00"
                      value={totalCost}
                      onChange={(e) => setTotalCost(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Combined cost of all ingredients
                    </p>
                  </div>
                </div>

                <Button onClick={handleCalculateLiquid} className="w-full">
                  Calculate Infusion Yield
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
                            <Badge variant="outline" className="text-xs">
                              {calc.mode === 'liquid' ? 'Infusion' : 'Solid'}
                            </Badge>
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
                        {/* Show input ingredients for liquid infusions */}
                        {calc.mode === 'liquid' && calc.inputIngredients && (
                          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">Input Ingredients:</span>
                            {calc.inputIngredients.map((ing, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span>{ing.name}</span>
                                <span className="font-medium">{ing.amount} {ing.unit}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              {calc.mode === 'liquid' ? 'Total Input:' : 'Raw Weight:'}
                            </span>
                            <div className="font-medium">{calc.rawWeight.toFixed(1)} {calc.unit}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              {calc.mode === 'liquid' ? 'Final Yield:' : 'Prepared Weight:'}
                            </span>
                            <div className="font-medium">{calc.preparedWeight.toFixed(1)} {calc.unit}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              {calc.mode === 'liquid' ? 'Volume Lost:' : 'Wastage:'}
                            </span>
                            <div className="font-medium text-red-500">{calc.wastage.toFixed(1)} {calc.unit}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              {calc.mode === 'liquid' ? 'Total Cost:' : `Cost per ${calc.unit}:`}
                            </span>
                            <div className="font-medium">${calc.costPerLb.toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-border/50">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {calc.mode === 'liquid' ? 'Cost per ml:' : `True Usable Cost per ${calc.unit}:`}
                            </span>
                            <span className="text-lg font-bold text-primary">
                              ${calc.usableCost.toFixed(calc.mode === 'liquid' ? 4 : 2)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {calc.mode === 'liquid' 
                              ? `Total value of ${calc.preparedWeight.toFixed(0)}ml output: $${(calc.usableCost * calc.preparedWeight).toFixed(2)}`
                              : `Actual cost accounting for wastage: +$${(calc.usableCost - calc.costPerLb).toFixed(2)} per ${calc.unit}`
                            }
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
