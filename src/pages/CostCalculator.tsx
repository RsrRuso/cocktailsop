import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
  costPerUnit: string;
}

const CostCalculator = () => {
  const navigate = useNavigate();
  const [recipeName, setRecipeName] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: "1", name: "", amount: "", unit: "ml", costPerUnit: "" }
  ]);
  const [targetMargin, setTargetMargin] = useState("65");

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { id: Date.now().toString(), name: "", amount: "", unit: "ml", costPerUnit: "" }
    ]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter(ing => ing.id !== id));
    }
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: string) => {
    setIngredients(ingredients.map(ing => 
      ing.id === id ? { ...ing, [field]: value } : ing
    ));
  };

  const calculateCosts = () => {
    const validIngredients = ingredients.filter(i => i.amount && i.costPerUnit);
    if (validIngredients.length === 0) return null;

    const totalCost = validIngredients.reduce((sum, ing) => {
      const amount = parseFloat(ing.amount);
      const costPerUnit = parseFloat(ing.costPerUnit);
      return sum + (amount * costPerUnit);
    }, 0);

    const margin = parseFloat(targetMargin || "0") / 100;
    const suggestedPrice = totalCost / (1 - margin);
    const profit = suggestedPrice - totalCost;
    const actualMargin = (profit / suggestedPrice) * 100;

    return {
      totalCost: totalCost.toFixed(2),
      suggestedPrice: suggestedPrice.toFixed(2),
      profit: profit.toFixed(2),
      actualMargin: actualMargin.toFixed(2)
    };
  };

  const result = calculateCosts();

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />

      <div className="px-4 py-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/ops-tools")}
            className="glass-hover"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Cost Calculator</h1>
            <p className="text-sm text-muted-foreground">Calculate recipe costs and pricing</p>
          </div>
        </div>

        <Card className="glass p-6 space-y-6">
          <div className="space-y-2">
            <Label>Recipe/Cocktail Name</Label>
            <Input
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              placeholder="e.g., Espresso Martini"
              className="glass"
            />
          </div>

          <div className="space-y-2">
            <Label>Target Profit Margin (%)</Label>
            <Input
              type="number"
              value={targetMargin}
              onChange={(e) => setTargetMargin(e.target.value)}
              placeholder="65"
              className="glass"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Ingredients with Costs</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addIngredient}
                className="glass-hover"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>

            {ingredients.map((ingredient) => (
              <div key={ingredient.id} className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={ingredient.name}
                    onChange={(e) => updateIngredient(ingredient.id, "name", e.target.value)}
                    placeholder="Ingredient name"
                    className="glass flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(ingredient.id)}
                    disabled={ingredients.length === 1}
                    className="glass-hover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2 pl-2">
                  <Input
                    type="number"
                    value={ingredient.amount}
                    onChange={(e) => updateIngredient(ingredient.id, "amount", e.target.value)}
                    placeholder="Amount"
                    className="glass w-24"
                  />
                  <select
                    value={ingredient.unit}
                    onChange={(e) => updateIngredient(ingredient.id, "unit", e.target.value)}
                    className="glass rounded-md border border-input bg-background px-3 py-2 text-sm w-20"
                  >
                    <option value="ml">ml</option>
                    <option value="oz">oz</option>
                    <option value="g">g</option>
                    <option value="unit">unit</option>
                  </select>
                  <Input
                    type="number"
                    step="0.01"
                    value={ingredient.costPerUnit}
                    onChange={(e) => updateIngredient(ingredient.id, "costPerUnit", e.target.value)}
                    placeholder="Cost per unit"
                    className="glass flex-1"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {result && recipeName && (
          <Card className="glass p-6 space-y-4">
            <h3 className="font-bold text-lg">Cost Analysis</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="text-muted-foreground">Total Cost</span>
                <span className="font-bold">${result.totalCost}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="text-muted-foreground">Suggested Price</span>
                <span className="font-bold text-primary">${result.suggestedPrice}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="text-muted-foreground">Profit per Serve</span>
                <span className="font-bold text-green-600">${result.profit}</span>
              </div>
              <div className="flex justify-between items-center py-4">
                <span className="text-lg font-medium">Profit Margin</span>
                <span className="text-3xl font-bold text-primary">{result.actualMargin}%</span>
              </div>
            </div>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default CostCalculator;
