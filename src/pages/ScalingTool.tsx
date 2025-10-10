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
}

const ScalingTool = () => {
  const navigate = useNavigate();
  const [recipeName, setRecipeName] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: "1", name: "", amount: "", unit: "ml" }
  ]);
  const [scaleFactor, setScaleFactor] = useState("2");

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { id: Date.now().toString(), name: "", amount: "", unit: "ml" }
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

  const scaleRecipe = () => {
    if (!scaleFactor) return null;
    
    return ingredients.map(ing => ({
      ...ing,
      scaledAmount: (parseFloat(ing.amount || "0") * parseFloat(scaleFactor)).toFixed(2)
    }));
  };

  const scaledIngredients = scaleRecipe();

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
            <h1 className="text-2xl font-bold">Recipe Scaling Tool</h1>
            <p className="text-sm text-muted-foreground">Scale recipes up or down</p>
          </div>
        </div>

        <Card className="glass p-6 space-y-6">
          <div className="space-y-2">
            <Label>Recipe Name</Label>
            <Input
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              placeholder="e.g., Old Fashioned"
              className="glass"
            />
          </div>

          <div className="space-y-2">
            <Label>Scale Factor</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.5"
                value={scaleFactor}
                onChange={(e) => setScaleFactor(e.target.value)}
                placeholder="2"
                className="glass"
              />
              <span className="flex items-center text-sm text-muted-foreground">× original</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Examples: 0.5 for half, 2 for double, 10 for batch of 10
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Original Recipe</Label>
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
              <div key={ingredient.id} className="flex gap-2">
                <Input
                  value={ingredient.name}
                  onChange={(e) => updateIngredient(ingredient.id, "name", e.target.value)}
                  placeholder="Ingredient"
                  className="glass flex-1"
                />
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
                  <option value="cl">cl</option>
                  <option value="dash">dash</option>
                  <option value="tsp">tsp</option>
                </select>
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
            ))}
          </div>
        </Card>

        {scaledIngredients && recipeName && scaleFactor && (
          <Card className="glass p-6 space-y-4">
            <h3 className="font-bold text-lg">Scaled Recipe</h3>
            <p className="text-sm text-muted-foreground">
              {recipeName} (×{scaleFactor})
            </p>
            <div className="space-y-2">
              {scaledIngredients.map((ing) => (
                <div key={ing.id} className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="font-medium">{ing.name || "Unnamed"}</span>
                  <span className="text-primary font-bold">
                    {(ing as any).scaledAmount} {ing.unit}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ScalingTool;
