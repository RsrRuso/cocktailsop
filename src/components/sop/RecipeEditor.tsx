import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, Camera, Sparkles } from "lucide-react";
import { CocktailRecipe, RecipeIngredient } from "@/types/cocktail-recipe";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";


interface RecipeEditorProps {
  recipe: CocktailRecipe;
  onChange: (recipe: CocktailRecipe) => void;
}

const ingredientTypes = ["Spirit", "Liqueur", "Mixer", "Syrup", "Bitters", "Juice", "Other"];
const units = ["ml", "oz", "dash", "drops", "barspoon", "piece"];
const glassTypes = ["Rock Glass", "Coupe", "Martini Glass", "Highball", "Collins", "Nick & Nora", "Wine Glass", "Shot Glass", "Hurricane", "Copper Mug"];
const iceTypes = ["Block Ice", "Large Cube", "Cubed Ice", "Crushed Ice", "No Ice", "Pebble Ice"];

const RecipeEditor = ({ recipe, onChange }: RecipeEditorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [newIngredient, setNewIngredient] = useState<RecipeIngredient>({
    name: "",
    amount: "",
    unit: "ml",
    abv: "",
    type: "Spirit",
    notes: "",
  });

  const updateField = (field: keyof CocktailRecipe, value: any) => {
    onChange({ ...recipe, [field]: value });
  };

  const addIngredient = () => {
    if (!newIngredient.name.trim()) {
      toast.error("Please enter ingredient name");
      return;
    }
    
    onChange({ ...recipe, ingredients: [...recipe.ingredients, newIngredient] });
    
    // Reset the form
    setNewIngredient({
      name: "",
      amount: "",
      unit: "ml",
      abv: "",
      type: "Spirit",
      notes: "",
    });
    
    toast.success("Ingredient added");
  };

  const removeIngredient = (index: number) => {
    const newIngredients = recipe.ingredients.filter((_, i) => i !== index);
    onChange({ ...recipe, ingredients: newIngredients });
  };

  const updateNewIngredient = (field: keyof RecipeIngredient, value: string) => {
    setNewIngredient({ ...newIngredient, [field]: value });
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

  const generateMethod = async () => {
    if (recipe.ingredients.length === 0) {
      toast.error("Add ingredients first");
      return;
    }

    if (!recipe.technique) {
      toast.error("Select a technique first");
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading("Generating method...");

    try {
      const { data, error } = await supabase.functions.invoke("cocktail-ai-helper", {
        body: {
          type: "method",
          data: {
            ingredients: recipe.ingredients,
            technique: recipe.technique,
            glass: recipe.glass,
            ice: recipe.ice,
            garnish: recipe.garnish,
          },
        },
      });

      if (error) throw error;

      updateField("methodSOP", data.result);
      toast.success("Method generated!");
    } catch (error: any) {
      console.error("Error generating method:", error);
      toast.error(error.message || "Failed to generate method");
    } finally {
      toast.dismiss(toastId);
      setIsGenerating(false);
    }
  };

  const detectAllergens = async () => {
    if (recipe.ingredients.length === 0) {
      toast.error("Add ingredients first");
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading("Detecting allergens...");

    try {
      const { data, error } = await supabase.functions.invoke("cocktail-ai-helper", {
        body: {
          type: "allergen",
          data: {
            ingredients: recipe.ingredients,
          },
        },
      });

      if (error) throw error;

      updateField("allergens", data.result);
      toast.success("Allergens detected!");
    } catch (error: any) {
      console.error("Error detecting allergens:", error);
      toast.error(error.message || "Failed to detect allergens");
    } finally {
      toast.dismiss(toastId);
      setIsGenerating(false);
    }
  };

  const generateHistory = async () => {
    if (!recipe.drinkName.trim()) {
      toast.error("Enter a drink name first");
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading("Generating cocktail history...");

    try {
      const { data, error } = await supabase.functions.invoke("cocktail-ai-helper", {
        body: {
          type: "history",
          data: {
            drinkName: recipe.drinkName,
          },
        },
      });

      if (error) throw error;

      if (data.result && data.result !== "Not a classic cocktail") {
        updateField("serviceNotes", data.result);
        toast.success("History generated!");
      } else {
        toast.info("Not a classic cocktail - no history available");
      }
    } catch (error: any) {
      console.error("Error generating history:", error);
      toast.error(error.message || "Failed to generate history");
    } finally {
      toast.dismiss(toastId);
      setIsGenerating(false);
    }
  };

  const updateTaste = (key: keyof typeof recipe.tasteProfile, value: number) => {
    onChange({ 
      ...recipe, 
      tasteProfile: { ...recipe.tasteProfile, [key]: value } 
    });
  };

  const updateTexture = (key: keyof typeof recipe.textureProfile, value: number) => {
    onChange({ 
      ...recipe, 
      textureProfile: { ...recipe.textureProfile, [key]: value } 
    });
  };

  const tastes: { key: keyof typeof recipe.tasteProfile; label: string }[] = [
    { key: "sweet", label: "Sweet" },
    { key: "sour", label: "Sour" },
    { key: "bitter", label: "Bitter" },
    { key: "salty", label: "Salty" },
    { key: "umami", label: "Umami" },
  ];

  const textures: { key: keyof typeof recipe.textureProfile; label: string }[] = [
    { key: "body", label: "Body" },
    { key: "foam", label: "Foam" },
    { key: "bubbles", label: "Bubbles" },
    { key: "oiliness", label: "Oiliness" },
    { key: "creaminess", label: "Creaminess" },
    { key: "astringency", label: "Astringency" },
  ];

  return (
    <div className="space-y-4 pb-20">
      {/* Basic Info */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Basic Info</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="drinkName" className="text-foreground">Drink Name *</Label>
            <Input
              id="drinkName"
              value={recipe.drinkName}
              onChange={(e) => updateField("drinkName", e.target.value)}
              placeholder="e.g., Negroni"
              className="mt-1 text-base bg-muted text-foreground placeholder:text-muted-foreground"
              maxLength={100}
            />
          </div>
          
          <div>
            <Label htmlFor="brandName" className="text-foreground">Brand Name</Label>
            <Input
              id="brandName"
              value={recipe.brandName || ""}
              onChange={(e) => updateField("brandName", e.target.value)}
              placeholder="e.g., Your Bar Name"
              className="mt-1 text-base bg-muted text-foreground placeholder:text-muted-foreground"
              maxLength={50}
            />
          </div>
          
          <div>
            <Label htmlFor="technique" className="text-foreground">Technique *</Label>
            <Select value={recipe.technique} onValueChange={(v) => updateField("technique", v)}>
              <SelectTrigger id="technique" className="mt-1 bg-muted text-foreground">
                <SelectValue placeholder="Select technique" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Stir">Stir</SelectItem>
                <SelectItem value="Shake">Shake</SelectItem>
                <SelectItem value="Build">Build</SelectItem>
                <SelectItem value="Blend">Blend</SelectItem>
                <SelectItem value="Muddle">Muddle</SelectItem>
                <SelectItem value="Throw">Throw</SelectItem>
                <SelectItem value="Swizzle">Swizzle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="glass" className="text-foreground">Glass</Label>
            <Select value={recipe.glass} onValueChange={(v) => updateField("glass", v)}>
              <SelectTrigger id="glass" className="mt-1 bg-muted text-foreground">
                <SelectValue placeholder="Select glass" />
              </SelectTrigger>
              <SelectContent>
                {glassTypes.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="ice" className="text-foreground">Ice</Label>
            <Select value={recipe.ice} onValueChange={(v) => updateField("ice", v)}>
              <SelectTrigger id="ice" className="mt-1 bg-muted text-foreground">
                <SelectValue placeholder="Select ice" />
              </SelectTrigger>
              <SelectContent>
                {iceTypes.map(i => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="garnish" className="text-foreground">Garnish</Label>
            <Input
              id="garnish"
              value={recipe.garnish}
              onChange={(e) => updateField("garnish", e.target.value)}
              placeholder="e.g., Orange peel"
              className="mt-1 text-base bg-muted text-foreground placeholder:text-muted-foreground"
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="ratio" className="text-foreground text-xs">Ratio</Label>
              <Input
                id="ratio"
                value={recipe.ratio}
                onChange={(e) => updateField("ratio", e.target.value)}
                placeholder="2:1:1"
                className="mt-1 text-sm bg-muted text-foreground placeholder:text-muted-foreground"
                maxLength={20}
              />
            </div>
            <div>
              <Label htmlFor="ph" className="text-foreground text-xs">pH</Label>
              <Input
                id="ph"
                type="number"
                step="0.1"
                value={recipe.ph}
                onChange={(e) => updateField("ph", e.target.value)}
                placeholder="3.5"
                className="mt-1 text-sm bg-muted text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <Label htmlFor="brix" className="text-foreground text-xs">Brix</Label>
              <Input
                id="brix"
                type="number"
                step="0.1"
                value={recipe.brix}
                onChange={(e) => updateField("brix", e.target.value)}
                placeholder="15"
                className="mt-1 text-sm bg-muted text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="allergens" className="text-foreground">Allergens</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={detectAllergens}
                disabled={isGenerating || recipe.ingredients.length === 0}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Auto Detect
              </Button>
            </div>
            <Input
              id="allergens"
              value={recipe.allergens}
              onChange={(e) => updateField("allergens", e.target.value)}
              placeholder="e.g., Soy, Nuts"
              className="mt-1 text-base bg-muted text-foreground placeholder:text-muted-foreground"
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="image" className="text-foreground">Image</Label>
            <div className="flex items-center gap-3 mt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("imageInput")?.click()}
                className="flex-1"
              >
                <Camera className="mr-2 h-4 w-4" />
                {recipe.mainImage ? "Change" : "Add"}
              </Button>
              <input
                id="imageInput"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            {recipe.mainImage && (
              <img src={recipe.mainImage} alt="Preview" className="mt-3 w-full h-32 object-cover rounded" />
            )}
          </div>
        </div>
      </Card>

      {/* Recipe Ingredients */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recipe</h2>
          <Button onClick={addIngredient} size="sm" variant="outline">
            <Plus className="mr-1 h-4 w-4" /> Add One
          </Button>
        </div>

        {/* PDF Display Options */}
        <div className="mb-4 p-3 bg-accent/10 rounded-lg border border-accent/20">
          <Label className="text-foreground font-medium mb-2 block">PDF Display Options</Label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recipe.pdfOptions?.showBrandName !== false}
                onChange={(e) => updateField('pdfOptions', { ...recipe.pdfOptions, showBrandName: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Show Brand Name</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recipe.pdfOptions?.showAmount !== false}
                onChange={(e) => updateField('pdfOptions', { ...recipe.pdfOptions, showAmount: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Show Amount</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recipe.pdfOptions?.showUnit !== false}
                onChange={(e) => updateField('pdfOptions', { ...recipe.pdfOptions, showUnit: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Show Unit</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recipe.pdfOptions?.showType !== false}
                onChange={(e) => updateField('pdfOptions', { ...recipe.pdfOptions, showType: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Show Type</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recipe.pdfOptions?.showABV !== false}
                onChange={(e) => updateField('pdfOptions', { ...recipe.pdfOptions, showABV: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Show ABV%</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recipe.pdfOptions?.showNotes !== false}
                onChange={(e) => updateField('pdfOptions', { ...recipe.pdfOptions, showNotes: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Show Notes</span>
            </label>
          </div>
        </div>

        {/* Add Ingredient Form - Single reusable form */}
        <Card className="p-4 bg-accent/10 border-2 border-accent">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="h-5 w-5 text-accent" />
            <Label className="text-foreground font-bold text-lg">Add Ingredient</Label>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="new-ing-name" className="text-foreground font-medium">Ingredient *</Label>
              <Input
                id="new-ing-name"
                value={newIngredient.name}
                onChange={(e) => updateNewIngredient("name", e.target.value)}
                placeholder="e.g., Bourbon, Woodford Reserve"
                className="mt-1 text-base bg-background text-foreground placeholder:text-muted-foreground font-medium"
                maxLength={100}
                onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="new-ing-amount" className="text-foreground text-xs">Amt (Optional)</Label>
                <Input
                  id="new-ing-amount"
                  type="number"
                  step="0.1"
                  value={newIngredient.amount}
                  onChange={(e) => updateNewIngredient("amount", e.target.value)}
                  placeholder="60"
                  className="mt-1 text-sm bg-background text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <Label htmlFor="new-ing-unit" className="text-foreground text-xs">Unit</Label>
                <Select 
                  value={newIngredient.unit} 
                  onValueChange={(v) => updateNewIngredient("unit", v)}
                >
                  <SelectTrigger id="new-ing-unit" className="mt-1 bg-background text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="new-ing-abv" className="text-foreground text-xs">ABV</Label>
                <Input
                  id="new-ing-abv"
                  type="number"
                  step="0.1"
                  value={newIngredient.abv}
                  onChange={(e) => updateNewIngredient("abv", e.target.value)}
                  placeholder="40"
                  className="mt-1 text-sm bg-background text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="new-ing-type" className="text-foreground text-xs">Type</Label>
              <Select 
                value={newIngredient.type} 
                onValueChange={(v) => updateNewIngredient("type", v)}
              >
                <SelectTrigger id="new-ing-type" className="mt-1 bg-background text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ingredientTypes.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="new-ing-notes" className="text-foreground text-xs">Notes</Label>
              <Input
                id="new-ing-notes"
                value={newIngredient.notes}
                onChange={(e) => updateNewIngredient("notes", e.target.value)}
                placeholder="Optional notes"
                className="mt-1 text-sm bg-background text-foreground placeholder:text-muted-foreground"
                maxLength={200}
              />
            </div>

            <Button
              onClick={addIngredient}
              className="w-full"
              type="button"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add to Recipe
            </Button>
          </div>
        </Card>

        {/* List of added ingredients */}
        {recipe.ingredients.length > 0 && (
          <div className="space-y-2">
            <Label className="text-foreground font-medium">Recipe Ingredients ({recipe.ingredients.length})</Label>
            {recipe.ingredients.map((ingredient, index) => (
              <Card key={index} className="p-3 bg-muted/30 border">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{ingredient.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {ingredient.amount && `${ingredient.amount} ${ingredient.unit}`}
                      {ingredient.abv && ` • ${ingredient.abv}% ABV`}
                      {ingredient.type && ` • ${ingredient.type}`}
                    </div>
                    {ingredient.notes && (
                      <div className="text-xs text-muted-foreground italic mt-1">{ingredient.notes}</div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(index)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Method */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Method (SOP)</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={generateMethod}
            disabled={isGenerating || recipe.ingredients.length === 0 || !recipe.technique}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            AI Generate
          </Button>
        </div>
        <Textarea
          value={recipe.methodSOP}
          onChange={(e) => updateField("methodSOP", e.target.value)}
          placeholder="Describe the preparation method step by step..."
          className="min-h-[120px] text-base bg-muted text-foreground placeholder:text-muted-foreground"
          maxLength={2000}
        />
      </Card>

      {/* Service Notes */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Service Notes</h2>
          <Button
            onClick={generateHistory}
            disabled={isGenerating || !recipe.drinkName.trim()}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Generate History
          </Button>
        </div>
        <Textarea
          value={recipe.serviceNotes}
          onChange={(e) => updateField("serviceNotes", e.target.value)}
          placeholder="Add service notes, story, or presentation details..."
          className="min-h-[120px] text-base bg-muted text-foreground placeholder:text-muted-foreground"
          maxLength={2000}
        />
      </Card>

      {/* Taste Profile */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Taste Profile</h2>
        <div className="space-y-4">
          {tastes.map(({ key, label }) => (
            <div key={key}>
              <div className="flex justify-between mb-2">
                <Label className="text-foreground">{label}</Label>
                <span className="text-sm text-muted-foreground font-mono">{recipe.tasteProfile[key]}/10</span>
              </div>
              <Slider
                value={[recipe.tasteProfile[key]]}
                onValueChange={([v]) => updateTaste(key, v)}
                max={10}
                step={1}
                className="w-full"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Texture Profile */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Texture Profile</h2>
        <div className="space-y-4">
          {textures.map(({ key, label }) => (
            <div key={key}>
              <div className="flex justify-between mb-2">
                <Label className="text-foreground">{label}</Label>
                <span className="text-sm text-muted-foreground font-mono">{recipe.textureProfile[key]}/10</span>
              </div>
              <Slider
                value={[recipe.textureProfile[key]]}
                onValueChange={([v]) => updateTexture(key, v)}
                max={10}
                step={1}
                className="w-full"
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default RecipeEditor;
