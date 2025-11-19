import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Download, Eye, Save, FileText } from 'lucide-react';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Ingredient {
  id: string;
  ingredient: string;
  amount: number;
  unit: string;
  abv: number;
}

interface CocktailSOP {
  id: string;
  drink_name: string;
  technique: string;
  glass: string;
  ice: string;
  garnish: string;
  main_image?: string | null;
  total_ml: number;
  abv_percentage: number;
  ratio?: string | null;
  ph?: number | null;
  brix?: number | null;
  kcal?: number | null;
  method_sop: string;
  service_notes?: string | null;
  taste_sweet?: number | null;
  taste_sour?: number | null;
  taste_salty?: number | null;
  taste_umami?: number | null;
  taste_bitter?: number | null;
  recipe: any;
  created_at: string;
  updated_at?: string;
  user_id?: string;
}

const TECHNIQUES = ['Shake', 'Stir', 'Build', 'Blend', 'Muddle'];
const GLASS_TYPES = ['Rocks', 'Coupe', 'Highball', 'Collins', 'Martini', 'Nick & Nora'];
const ICE_TYPES = ['Cubed', 'Block', 'Crushed', 'None'];

// Smart ingredient database with common spirits and modifiers
const INGREDIENT_DB: Record<string, { abv: number; unit: string }> = {
  'Vodka': { abv: 40, unit: 'ml' },
  'Gin': { abv: 40, unit: 'ml' },
  'Rum': { abv: 40, unit: 'ml' },
  'Whiskey': { abv: 40, unit: 'ml' },
  'Tequila': { abv: 40, unit: 'ml' },
  'Mezcal': { abv: 40, unit: 'ml' },
  'Cognac': { abv: 40, unit: 'ml' },
  'Campari': { abv: 25, unit: 'ml' },
  'Vermouth': { abv: 18, unit: 'ml' },
  'Lime Juice': { abv: 0, unit: 'ml' },
  'Lemon Juice': { abv: 0, unit: 'ml' },
  'Simple Syrup': { abv: 0, unit: 'ml' },
  'Egg White': { abv: 0, unit: 'ml' },
  'Bitters': { abv: 0, unit: 'dash' },
};

export default function CocktailSOP() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [sops, setSops] = useState<CocktailSOP[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSOP, setSelectedSOP] = useState<CocktailSOP | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state - simplified
  const [drinkName, setDrinkName] = useState('');
  const [technique, setTechnique] = useState('Shake');
  const [glass, setGlass] = useState('Coupe');
  const [ice, setIce] = useState('Cubed');
  const [garnish, setGarnish] = useState('');
  const [methodSop, setMethodSop] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchSOPs();
  }, [user, navigate]);

  const fetchSOPs = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('cocktail_sops')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error loading SOPs', variant: 'destructive' });
    } else {
      setSops(data || []);
    }
  };

  // Smart auto-calculation of ABV and total volume
  const calculateMetrics = () => {
    const totalVolume = ingredients.reduce((sum, ing) => {
      return ing.unit === 'ml' ? sum + ing.amount : sum;
    }, 0);

    const totalAlcohol = ingredients.reduce((sum, ing) => {
      return ing.unit === 'ml' ? sum + (ing.amount * ing.abv / 100) : sum;
    }, 0);

    const abv = totalVolume > 0 ? (totalAlcohol / totalVolume) * 100 : 0;

    return {
      totalMl: Math.round(totalVolume),
      abvPercentage: Math.round(abv * 10) / 10,
    };
  };

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      {
        id: crypto.randomUUID(),
        ingredient: '',
        amount: 0,
        unit: 'ml',
        abv: 0,
      },
    ]);
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: any) => {
    setIngredients(
      ingredients.map((ing) => {
        if (ing.id === id) {
          const updated = { ...ing, [field]: value };
          
          // Smart ABV suggestion based on ingredient name
          if (field === 'ingredient') {
            const match = Object.entries(INGREDIENT_DB).find(
              ([key]) => key.toLowerCase() === value.toLowerCase()
            );
            if (match) {
              updated.abv = match[1].abv;
              updated.unit = match[1].unit;
            }
          }
          
          return updated;
        }
        return ing;
      })
    );
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter((ing) => ing.id !== id));
  };

  const resetForm = () => {
    setDrinkName('');
    setTechnique('Shake');
    setGlass('Coupe');
    setIce('Cubed');
    setGarnish('');
    setMethodSop('');
    setIngredients([]);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!user || !drinkName) {
      toast({ title: 'Please fill in drink name', variant: 'destructive' });
      return;
    }

    const metrics = calculateMetrics();
    
    const sopData = {
      user_id: user.id,
      drink_name: drinkName,
      technique,
      glass,
      ice,
      garnish,
      total_ml: metrics.totalMl,
      abv_percentage: metrics.abvPercentage,
      method_sop: methodSop,
      recipe: ingredients as any,
    };

    if (editingId) {
      const { error } = await supabase
        .from('cocktail_sops')
        .update(sopData)
        .eq('id', editingId);

      if (error) {
        toast({ title: 'Error updating SOP', variant: 'destructive' });
      } else {
        toast({ title: 'SOP updated successfully' });
        setIsModalOpen(false);
        resetForm();
        fetchSOPs();
      }
    } else {
      const { error } = await supabase.from('cocktail_sops').insert([sopData as any]);

      if (error) {
        toast({ title: 'Error creating SOP', variant: 'destructive' });
      } else {
        toast({ title: 'SOP created successfully' });
        setIsModalOpen(false);
        resetForm();
        fetchSOPs();
      }
    }
  };

  const handleEdit = (sop: CocktailSOP) => {
    setEditingId(sop.id);
    setDrinkName(sop.drink_name);
    setTechnique(sop.technique);
    setGlass(sop.glass);
    setIce(sop.ice);
    setGarnish(sop.garnish);
    setMethodSop(sop.method_sop);
    const recipeData = Array.isArray(sop.recipe) ? sop.recipe : [];
    setIngredients(recipeData);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('cocktail_sops')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error deleting SOP', variant: 'destructive' });
    } else {
      toast({ title: 'SOP deleted' });
      fetchSOPs();
    }
  };

  const exportToPDF = (sop: CocktailSOP) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.text('LAB - SOP', 20, 20);
    
    doc.setFontSize(18);
    doc.text(sop.drink_name, 20, 35);
    
    // Recipe table
    doc.setFontSize(12);
    doc.text('Recipe', 20, 50);
    
    const recipeData = Array.isArray(sop.recipe) ? sop.recipe : [];
    
    autoTable(doc, {
      startY: 55,
      head: [['Ingredient', 'Amount', 'Unit', 'ABV %']],
      body: recipeData.map((ing: any) => [
        ing.ingredient || '',
        ing.amount?.toString() || '0',
        ing.unit || 'ml',
        (ing.abv?.toString() || '0') + '%',
      ]),
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Specs
    doc.text(`Technique: ${sop.technique}`, 20, finalY);
    doc.text(`Glass: ${sop.glass}`, 20, finalY + 7);
    doc.text(`Ice: ${sop.ice}`, 20, finalY + 14);
    doc.text(`Garnish: ${sop.garnish}`, 20, finalY + 21);
    doc.text(`Total: ${sop.total_ml}ml | ABV: ${sop.abv_percentage}%`, 20, finalY + 28);
    
    // Method
    if (sop.method_sop) {
      doc.text('Method:', 20, finalY + 40);
      const splitMethod = doc.splitTextToSize(sop.method_sop, 170);
      doc.text(splitMethod, 20, finalY + 47);
    }
    
    doc.save(`${sop.drink_name}_SOP.pdf`);
    toast({ title: 'PDF exported successfully' });
  };

  const metrics = calculateMetrics();

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">LAB - SOP</h1>
            <p className="text-muted-foreground">Smart Cocktail Standard Operating Procedures</p>
          </div>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            New SOP
          </Button>
        </div>

        {sops.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No SOPs yet</h3>
            <p className="text-muted-foreground mb-6">Create your first cocktail SOP to get started</p>
            <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Create First SOP
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sops.map((sop) => (
              <Card key={sop.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg">{sop.drink_name}</h3>
                    <p className="text-sm text-muted-foreground">{sop.technique} • {sop.glass}</p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Volume:</span>
                    <span className="font-medium">{sop.total_ml}ml</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ABV:</span>
                    <span className="font-medium">{sop.abv_percentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ingredients:</span>
                    <span className="font-medium">{Array.isArray(sop.recipe) ? sop.recipe.length : 0}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setSelectedSOP(sop); setIsDetailOpen(true); }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToPDF(sop)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(sop)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(sop.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'Create'} Cocktail SOP</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="recipe">Recipe</TabsTrigger>
              <TabsTrigger value="method">Method</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label>Drink Name *</Label>
                <Input
                  value={drinkName}
                  onChange={(e) => setDrinkName(e.target.value)}
                  placeholder="e.g., Classic Margarita"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Technique</Label>
                  <Select value={technique} onValueChange={setTechnique}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TECHNIQUES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Glass</Label>
                  <Select value={glass} onValueChange={setGlass}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GLASS_TYPES.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Ice</Label>
                  <Select value={ice} onValueChange={setIce}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICE_TYPES.map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Garnish</Label>
                  <Input
                    value={garnish}
                    onChange={(e) => setGarnish(e.target.value)}
                    placeholder="e.g., Lime wheel"
                  />
                </div>
              </div>

              <Card className="p-4 bg-secondary/50">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{metrics.totalMl}ml</div>
                    <div className="text-sm text-muted-foreground">Total Volume</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{metrics.abvPercentage}%</div>
                    <div className="text-sm text-muted-foreground">ABV</div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="recipe" className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Ingredients</Label>
                <Button onClick={addIngredient} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Ingredient
                </Button>
              </div>

              {ingredients.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">No ingredients yet</p>
                  <Button onClick={addIngredient} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Ingredient
                  </Button>
                </Card>
              ) : (
                <div className="space-y-3">
                  {ingredients.map((ing) => (
                    <Card key={ing.id} className="p-4">
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-5">
                          <Label className="text-xs">Ingredient</Label>
                          <Input
                            value={ing.ingredient}
                            onChange={(e) => updateIngredient(ing.id, 'ingredient', e.target.value)}
                            placeholder="e.g., Tequila"
                            list="ingredient-suggestions"
                          />
                          <datalist id="ingredient-suggestions">
                            {Object.keys(INGREDIENT_DB).map(name => (
                              <option key={name} value={name} />
                            ))}
                          </datalist>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Amount</Label>
                          <Input
                            type="number"
                            value={ing.amount}
                            onChange={(e) => updateIngredient(ing.id, 'amount', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Unit</Label>
                          <Select
                            value={ing.unit}
                            onValueChange={(val) => updateIngredient(ing.id, 'unit', val)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ml">ml</SelectItem>
                              <SelectItem value="oz">oz</SelectItem>
                              <SelectItem value="dash">dash</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">ABV %</Label>
                          <Input
                            type="number"
                            value={ing.abv}
                            onChange={(e) => updateIngredient(ing.id, 'abv', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeIngredient(ing.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="method" className="space-y-4">
              <div>
                <Label>Preparation Method</Label>
                <Textarea
                  value={methodSop}
                  onChange={(e) => setMethodSop(e.target.value)}
                  placeholder="Describe the step-by-step preparation method..."
                  rows={10}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save SOP
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail View Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSOP?.drink_name}</DialogTitle>
          </DialogHeader>

          {selectedSOP && (
            <div className="space-y-6">
              <Card className="p-4 bg-secondary/50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Technique</div>
                    <div className="font-medium">{selectedSOP.technique}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Glass</div>
                    <div className="font-medium">{selectedSOP.glass}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Ice</div>
                    <div className="font-medium">{selectedSOP.ice}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Garnish</div>
                    <div className="font-medium">{selectedSOP.garnish}</div>
                  </div>
                </div>
              </Card>

              <div>
                <h3 className="font-semibold mb-3">Recipe</h3>
                <div className="space-y-2">
                  {Array.isArray(selectedSOP.recipe) && selectedSOP.recipe.map((ing: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b">
                      <span>{ing.ingredient}</span>
                      <span className="font-medium">{ing.amount}{ing.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Card className="p-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-primary">{selectedSOP.total_ml}ml</div>
                    <div className="text-sm text-muted-foreground">Total Volume</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary">{selectedSOP.abv_percentage}%</div>
                    <div className="text-sm text-muted-foreground">ABV</div>
                  </div>
                </div>
              </Card>

              {selectedSOP.method_sop && (
                <div>
                  <h3 className="font-semibold mb-3">Method</h3>
                  <p className="text-sm whitespace-pre-wrap">{selectedSOP.method_sop}</p>
                </div>
              )}

              <Button onClick={() => exportToPDF(selectedSOP)} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Export to PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
