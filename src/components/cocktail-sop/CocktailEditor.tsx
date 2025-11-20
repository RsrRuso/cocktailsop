import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Camera } from "lucide-react";
import { CocktailData, Ingredient } from "@/types/cocktail";
import TasteProfileSliders from "./TasteProfileSliders";
import CocktailCharts from "./CocktailCharts";
import CocktailMetrics from "./CocktailMetrics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CocktailEditorProps {
  data: CocktailData;
  onChange: (data: CocktailData) => void;
}

const ingredientTypes = [
  "Spirit",
  "Liqueur",
  "Mixer",
  "Syrup",
  "Bitters",
  "Juice",
  "Garnish",
  "Other",
];

const CocktailEditor = ({ data, onChange }: CocktailEditorProps) => {
  const updateField = (field: keyof CocktailData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const addIngredient = () => {
    const newIngredient: Ingredient = {
      name: "",
      amount: "",
      unit: "ml",
      abv: "",
      type: "Spirit",
    };
    onChange({ ...data, ingredients: [...data.ingredients, newIngredient] });
  };

  const removeIngredient = (index: number) => {
    const newIngredients = data.ingredients.filter((_, i) => i !== index);
    onChange({ ...data, ingredients: newIngredients });
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const newIngredients = [...data.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    onChange({ ...data, ingredients: newIngredients });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      updateField("mainImage", reader.result as string);
      toast.success("Image loaded!");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Basic Info */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Drink Name</Label>
            <Input
              value={data.drinkName}
              onChange={(e) => updateField("drinkName", e.target.value)}
              placeholder="e.g., Negroni"
              className="text-lg"
            />
          </div>
          <div>
            <Label>Glass</Label>
            <Input
              value={data.glass}
              onChange={(e) => updateField("glass", e.target.value)}
              placeholder="e.g., Rocks glass"
            />
          </div>
          <div>
            <Label>Ice</Label>
            <Input
              value={data.ice}
              onChange={(e) => updateField("ice", e.target.value)}
              placeholder="e.g., Large cube"
            />
          </div>
          <div>
            <Label>Garnish</Label>
            <Input
              value={data.garnish}
              onChange={(e) => updateField("garnish", e.target.value)}
              placeholder="e.g., Orange peel"
            />
          </div>
          <div>
            <Label>Technique</Label>
            <Input
              value={data.technique}
              onChange={(e) => updateField("technique", e.target.value)}
              placeholder="e.g., Stirred"
            />
          </div>
        </div>

        {/* Image Upload */}
        <div className="mt-4">
          <Label>Cocktail Image</Label>
          <div className="flex items-center gap-4 mt-2">
            {data.mainImage && (
              <img
                src={data.mainImage}
                alt="Cocktail"
                className="w-32 h-32 object-cover rounded-lg"
              />
            )}
            <Button variant="outline" asChild>
              <label className="cursor-pointer">
                <Camera className="h-4 w-4 mr-2" />
                {data.mainImage ? "Change Image" : "Upload Image"}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>
            </Button>
          </div>
        </div>
      </Card>

      {/* Ingredients */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recipe</h2>
          <Button onClick={addIngredient} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Ingredient
          </Button>
        </div>
        <div className="space-y-3">
          {data.ingredients.map((ingredient, index) => (
            <div key={index} className="flex gap-2 items-start">
              <Input
                placeholder="Name"
                value={ingredient.name}
                onChange={(e) => updateIngredient(index, "name", e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Amount"
                value={ingredient.amount}
                onChange={(e) => updateIngredient(index, "amount", e.target.value)}
                className="w-20"
                type="number"
              />
              <Input
                placeholder="Unit"
                value={ingredient.unit}
                onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                className="w-16"
              />
              <Input
                placeholder="ABV%"
                value={ingredient.abv}
                onChange={(e) => updateIngredient(index, "abv", e.target.value)}
                className="w-20"
                type="number"
              />
              <select
                value={ingredient.type}
                onChange={(e) => updateIngredient(index, "type", e.target.value)}
                className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                {ingredientTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => removeIngredient(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Metrics & Charts */}
      <CocktailMetrics ingredients={data.ingredients} />
      <CocktailCharts ingredients={data.ingredients} tasteProfile={data.tasteProfile} />

      {/* Method */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Preparation Method</h2>
        <Textarea
          value={data.methodSOP}
          onChange={(e) => updateField("methodSOP", e.target.value)}
          placeholder="Step-by-step instructions..."
          rows={6}
        />
      </Card>

      {/* Taste Profile */}
      <TasteProfileSliders
        profile={data.tasteProfile}
        onChange={(profile) => updateField("tasteProfile", profile)}
      />

      {/* Service Notes */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Service Notes</h2>
        <Textarea
          value={data.serviceNotes}
          onChange={(e) => updateField("serviceNotes", e.target.value)}
          placeholder="Temperature, presentation, timing..."
          rows={4}
        />
      </Card>
    </div>
  );
};

export default CocktailEditor;
