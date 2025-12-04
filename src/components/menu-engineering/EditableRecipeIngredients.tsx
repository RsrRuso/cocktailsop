import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2, Check, X, Package } from "lucide-react";
import { toast } from "sonner";

export interface EditableIngredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  bottleSize: number;
  bottleCost: number;
  cost: number; // calculated from bottle cost ratio
}

interface EditableRecipeIngredientsProps {
  ingredients: EditableIngredient[];
  onIngredientsChange: (ingredients: EditableIngredient[]) => void;
  currency: string;
  onCurrencyChange: (currency: string) => void;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
];

const UNITS = ['ml', 'cl', 'oz', 'g', 'kg', 'pc', 'dashes', 'leaves', 'pinch', 'slice'];

export default function EditableRecipeIngredients({
  ingredients,
  onIngredientsChange,
  currency,
  onCurrencyChange
}: EditableRecipeIngredientsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newIngredient, setNewIngredient] = useState<Partial<EditableIngredient>>({
    name: '',
    amount: 0,
    unit: 'ml',
    bottleSize: 700,
    bottleCost: 0,
  });

  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol || '$';

  // Calculate cost from bottle cost and ratio
  const calculateCost = (amount: number, bottleSize: number, bottleCost: number): number => {
    if (bottleSize <= 0 || bottleCost <= 0) return 0;
    return (amount / bottleSize) * bottleCost;
  };

  const totalCost = useMemo(() => {
    return ingredients.reduce((sum, ing) => sum + ing.cost, 0);
  }, [ingredients]);

  const handleAddIngredient = () => {
    if (!newIngredient.name?.trim()) {
      toast.error("Please enter ingredient name");
      return;
    }
    if (!newIngredient.amount || newIngredient.amount <= 0) {
      toast.error("Please enter valid amount");
      return;
    }

    const cost = calculateCost(
      newIngredient.amount || 0,
      newIngredient.bottleSize || 700,
      newIngredient.bottleCost || 0
    );

    const ingredient: EditableIngredient = {
      id: `ing-${Date.now()}`,
      name: newIngredient.name.trim(),
      amount: newIngredient.amount || 0,
      unit: newIngredient.unit || 'ml',
      bottleSize: newIngredient.bottleSize || 700,
      bottleCost: newIngredient.bottleCost || 0,
      cost
    };

    onIngredientsChange([...ingredients, ingredient]);
    setNewIngredient({
      name: '',
      amount: 0,
      unit: 'ml',
      bottleSize: 700,
      bottleCost: 0,
    });
    setIsAdding(false);
    toast.success("Ingredient added");
  };

  const handleUpdateIngredient = (id: string, updates: Partial<EditableIngredient>) => {
    onIngredientsChange(ingredients.map(ing => {
      if (ing.id === id) {
        const updated = { ...ing, ...updates };
        // Recalculate cost if relevant fields changed
        if ('amount' in updates || 'bottleSize' in updates || 'bottleCost' in updates) {
          updated.cost = calculateCost(updated.amount, updated.bottleSize, updated.bottleCost);
        }
        return updated;
      }
      return ing;
    }));
  };

  const handleRemoveIngredient = (id: string) => {
    onIngredientsChange(ingredients.filter(ing => ing.id !== id));
    toast.success("Ingredient removed");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4" />
            Recipe & Ingredients ({ingredients.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={currency} onValueChange={onCurrencyChange}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsAdding(true)}
              disabled={isAdding}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add New Ingredient Form */}
        {isAdding && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Ingredient Name</Label>
                  <Input
                    placeholder="e.g. Vodka, Lime Juice"
                    value={newIngredient.name || ''}
                    onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Amount</Label>
                  <Input
                    type="number"
                    placeholder="60"
                    value={newIngredient.amount || ''}
                    onChange={(e) => setNewIngredient({ ...newIngredient, amount: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Unit</Label>
                  <Select 
                    value={newIngredient.unit || 'ml'} 
                    onValueChange={(v) => setNewIngredient({ ...newIngredient, unit: v })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Bottle Size (ml)</Label>
                  <Input
                    type="number"
                    placeholder="700"
                    value={newIngredient.bottleSize || ''}
                    onChange={(e) => setNewIngredient({ ...newIngredient, bottleSize: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Bottle Cost ({currencySymbol})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="25.00"
                    value={newIngredient.bottleCost || ''}
                    onChange={(e) => setNewIngredient({ ...newIngredient, bottleCost: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  Calculated Cost: <span className="font-bold text-foreground">
                    {currencySymbol}{calculateCost(
                      newIngredient.amount || 0,
                      newIngredient.bottleSize || 700,
                      newIngredient.bottleCost || 0
                    ).toFixed(2)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={handleAddIngredient}>
                    <Check className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ingredients List */}
        {ingredients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No ingredients yet</p>
            <p className="text-xs">Click "Add" to add ingredients</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ingredients.map((ing) => (
              <div key={ing.id} className="relative">
                {editingId === ing.id ? (
                  <Card className="bg-muted/30 border-primary/30">
                    <CardContent className="p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2">
                          <Label className="text-xs">Name</Label>
                          <Input
                            value={ing.name}
                            onChange={(e) => handleUpdateIngredient(ing.id, { name: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Amount</Label>
                          <Input
                            type="number"
                            value={ing.amount}
                            onChange={(e) => handleUpdateIngredient(ing.id, { amount: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Unit</Label>
                          <Select 
                            value={ing.unit} 
                            onValueChange={(v) => handleUpdateIngredient(ing.id, { unit: v })}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNITS.map(u => (
                                <SelectItem key={u} value={u}>{u}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Bottle Size (ml)</Label>
                          <Input
                            type="number"
                            value={ing.bottleSize}
                            onChange={(e) => handleUpdateIngredient(ing.id, { bottleSize: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Bottle Cost ({currencySymbol})</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={ing.bottleCost}
                            onChange={(e) => handleUpdateIngredient(ing.id, { bottleCost: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="text-xs">
                          Cost: <span className="font-bold">{currencySymbol}{ing.cost.toFixed(2)}</span>
                        </div>
                        <Button size="sm" onClick={() => setEditingId(null)}>
                          <Check className="h-4 w-4 mr-1" />
                          Done
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg group hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{ing.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{ing.amount} {ing.unit}</span>
                        <span>•</span>
                        <span>Bottle: {ing.bottleSize}ml @ {currencySymbol}{ing.bottleCost.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-bold">
                        {currencySymbol}{ing.cost.toFixed(2)}
                      </Badge>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7"
                          onClick={() => setEditingId(ing.id)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveIngredient(ing.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Total Cost */}
        {ingredients.length > 0 && (
          <div className="flex justify-between items-center pt-3 border-t mt-3">
            <span className="text-sm text-muted-foreground">Total Recipe Cost:</span>
            <span className="text-lg font-bold">{currencySymbol}{totalCost.toFixed(2)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
