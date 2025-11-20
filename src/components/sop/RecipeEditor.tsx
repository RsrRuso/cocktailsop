import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, Camera } from "lucide-react";
import { CocktailRecipe, RecipeIngredient } from "@/types/cocktail-recipe";
import { toast } from "sonner";

interface RecipeEditorProps {
  recipe: CocktailRecipe;
  onChange: (recipe: CocktailRecipe) => void;
}

const ingredientTypes = ["Spirit", "Liqueur", "Mixer", "Syrup", "Bitters", "Juice", "Other"];

const RecipeEditor = ({ recipe, onChange }: RecipeEditorProps) => {
  const updateField = (field: keyof CocktailRecipe, value: any) => {
    onChange({ ...recipe, [field]: value });
  };

  const addIngredient = () => {
    const newIngredient: RecipeIngredient = {
      name: "",
      amount: "",
      unit: "ml",
      abv: "",
      type: "Spirit",
    };
    onChange({ ...recipe, ingredients: [...recipe.ingredients, newIngredient] });
  };

  const removeIngredient = (index: number) => {
    const newIngredients = recipe.ingredients.filter((_, i) => i !== index);
    onChange({ ...recipe, ingredients: newIngredients });
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: string) => {
    const newIngredients = [...recipe.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    onChange({ ...recipe, ingredients: newIngredients });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      updateField("mainImage", reader.result as string);
      toast.success("Image loaded");
    };
    reader.readAsDataURL(file);
  };

  const updateTaste = (key: keyof typeof recipe.tasteProfile, value: number) => {
    onChange({ 
      ...recipe, 
      tasteProfile: { ...recipe.tasteProfile, [key]: value } 
    });
  };

  const tastes: { key: keyof typeof recipe.tasteProfile; label: string; color: string }[] = [
    { key: "sweet", label: "Sweet", color: "text-pink-500" },
    { key: "sour", label: "Sour", color: "text-yellow-500" },
    { key: "bitter", label: "Bitter", color: "text-orange-500" },
    { key: "salty", label: "Salty", color: "text-blue-500" },
    { key: "umami", label: "Umami", color: "text-purple-500" },
  ];

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Basic Info</h2>
        <div className="space-y-3">
          <div>
            <Label>Drink Name</Label>
            <Input
              value={recipe.drinkName}
              onChange={(e) => updateField("drinkName", e.target.value)}
              placeholder="e.g., Negroni"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Glass</Label>
              <Input
                value={recipe.glass}
                onChange={(e) => updateField("glass", e.target.value)}
                placeholder="Rocks glass"
              />
            </div>
            <div>
              <Label>Ice</Label>
              <Input
                value={recipe.ice}
                onChange={(e) => updateField("ice", e.target.value)}
                placeholder="Large cube"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Garnish</Label>
              <Input
                value={recipe.garnish}
                onChange={(e) => updateField("garnish", e.target.value)}
                placeholder="Orange peel"
              />
            </div>
            <div>
              <Label>Technique</Label>
              <Input
                value={recipe.technique}
                onChange={(e) => updateField("technique", e.target.value)}
                placeholder="Stirred"
              />
            </div>
          </div>
        </div>

        {/* Image Upload */}
        <div className="mt-4">
          <Label>Photo</Label>
          <div className="flex items-center gap-3 mt-2">
            {recipe.mainImage && (
              <img
                src={recipe.mainImage}
                alt="Cocktail"
                className="w-20 h-20 object-cover rounded-lg"
              />
            )}
            <Button variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                <Camera className="h-4 w-4 mr-2" />
                {recipe.mainImage ? "Change" : "Upload"}
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
      <Card className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Recipe</h2>
          <Button onClick={addIngredient} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {recipe.ingredients.map((ingredient, index) => (
            <div key={index} className="flex gap-2 items-start">
              <Input
                placeholder="Name"
                value={ingredient.name}
                onChange={(e) => updateIngredient(index, "name", e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Amt"
                value={ingredient.amount}
                onChange={(e) => updateIngredient(index, "amount", e.target.value)}
                className="w-16"
                type="number"
              />
              <Input
                placeholder="Unit"
                value={ingredient.unit}
                onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                className="w-14"
              />
              <Input
                placeholder="ABV"
                value={ingredient.abv}
                onChange={(e) => updateIngredient(index, "abv", e.target.value)}
                className="w-16"
                type="number"
              />
              <select
                value={ingredient.type}
                onChange={(e) => updateIngredient(index, "type", e.target.value)}
                className="h-10 px-2 py-2 rounded-md border border-input bg-background text-sm"
              >
                {ingredientTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
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

      {/* Method */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Method</h2>
        <Textarea
          value={recipe.methodSOP}
          onChange={(e) => updateField("methodSOP", e.target.value)}
          placeholder="Step-by-step instructions..."
          rows={4}
        />
      </Card>

      {/* Taste Profile */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Taste Profile</h2>
        <div className="space-y-4">
          {tastes.map(({ key, label, color }) => (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <Label className={color}>{label}</Label>
                <span className="text-sm text-muted-foreground">{recipe.tasteProfile[key]}/10</span>
              </div>
              <Slider
                value={[recipe.tasteProfile[key]]}
                onValueChange={([value]) => updateTaste(key, value)}
                max={10}
                step={1}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Service Notes */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Service Notes</h2>
        <Textarea
          value={recipe.serviceNotes}
          onChange={(e) => updateField("serviceNotes", e.target.value)}
          placeholder="Temperature, presentation, timing..."
          rows={3}
        />
      </Card>
    </div>
  );
};

export default RecipeEditor;
