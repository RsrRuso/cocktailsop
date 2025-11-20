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
  amount: number | string;
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
      const amount = typeof ing.amount === 'number' ? ing.amount : parseFloat(ing.amount) || 0;
      return ing.unit === 'ml' ? sum + amount : sum;
    }, 0);

    const totalAlcohol = ingredients.reduce((sum, ing) => {
      const amount = typeof ing.amount === 'number' ? ing.amount : parseFloat(ing.amount) || 0;
      return ing.unit === 'ml' ? sum + (amount * ing.abv / 100) : sum;
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
        amount: '',
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
    const recipeData = Array.isArray(sop.recipe) ? sop.recipe : [];
    
    // Header
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('ATTIKO — COCKTAIL SOP', 15, 15);
    
    // Main Title
    doc.setFontSize(24);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(sop.drink_name.toUpperCase(), 15, 28);
    
    // Identity Table (Left Column)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Identity', 15, 42);
    doc.text('Metrics', 75, 42);
    
    autoTable(doc, {
      startY: 45,
      head: [],
      body: [
        ['Drink Name', sop.drink_name],
        ['Technique', sop.technique],
        ['Glass', sop.glass],
        ['Ice', sop.ice],
        ['Garnish', sop.garnish],
        ['Total (ml)', sop.total_ml.toString()],
        ['ABV (%)', sop.abv_percentage.toFixed(1)],
        ['Ratio', sop.ratio || '—'],
        ['pH', sop.ph?.toString() || '0'],
        ['Brix', sop.brix?.toString() || '0'],
        ['Kcal', sop.kcal?.toString() || '0'],
      ],
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { cellWidth: 50 },
      },
      margin: { left: 15, right: 105 },
    });

    // Method (SOP) - Right Column
    let rightColY = 45;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Method (SOP)', 110, rightColY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    rightColY += 5;
    
    if (sop.method_sop) {
      const methodLines = doc.splitTextToSize(sop.method_sop, 85);
      doc.text(methodLines, 110, rightColY);
      rightColY += methodLines.length * 4 + 8;
    }

    // Service Notes - Right Column
    if (sop.service_notes) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Service Notes', 110, rightColY);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      rightColY += 5;
      
      const notesLines = doc.splitTextToSize(sop.service_notes, 85);
      doc.text(notesLines, 110, rightColY);
      rightColY += notesLines.length * 4 + 8;
    }

    // Recipe Table (Full Width at Bottom)
    const recipeStartY = Math.max((doc as any).lastAutoTable.finalY + 15, rightColY);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Recipe', 15, recipeStartY);
    
    autoTable(doc, {
      startY: recipeStartY + 3,
      head: [['INGREDIENT', 'AMOUNT', 'UNIT', 'TYPE', '%ABV', 'NOTES']],
      body: recipeData.map((ing: any) => [
        (ing.ingredient || '').toUpperCase(),
        ing.amount?.toString() || '0',
        ing.unit || 'ml',
        '', // Type field (empty for now)
        ing.abv?.toString() || '0',
        '', // Notes field (empty for now)
      ]),
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8,
      },
      margin: { left: 15, right: 15 },
    });

    // Add page number at bottom
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page 1 of ${pageCount}`, 15, 285);
    
    doc.save(`${sop.drink_name.replace(/\s+/g, '_')}_SOP.pdf`);
    toast({ title: 'PDF exported successfully' });
  };

  const metrics = calculateMetrics();

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">LAB - SOP</h1>
            <p className="text-sm text-muted-foreground">Smart Cocktail Standard Operating Procedures</p>
          </div>
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="h-9 w-full sm:w-auto">
            <Plus className="mr-2 h-3 w-3" />
            New SOP
          </Button>
        </div>

        {sops.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center">
            <FileText className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
            <h3 className="text-lg sm:text-xl font-semibold mb-2">No SOPs yet</h3>
            <p className="text-sm text-muted-foreground mb-4 sm:mb-6">Create your first cocktail SOP to get started</p>
            <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="h-9">
              <Plus className="mr-2 h-3 w-3" />
              Create First SOP
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {sops.map((sop) => (
              <Card key={sop.id} className="p-4 sm:p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base sm:text-lg truncate">{sop.drink_name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{sop.technique} • {sop.glass}</p>
                  </div>
                </div>
                
                <div className="space-y-1.5 mb-3 text-xs sm:text-sm">
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

                <div className="flex flex-wrap gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => { setSelectedSOP(sop); setIsDetailOpen(true); }}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToPDF(sop)}
                    className="h-8 px-2"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(sop)}
                    className="h-8 px-3 text-xs"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(sop.id)}
                    className="h-8 px-2"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-4 sm:p-6">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-xl">{editingId ? 'Edit' : 'Create'} Cocktail SOP</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 -mr-1">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="basic" className="text-xs sm:text-sm">Basic Info</TabsTrigger>
              <TabsTrigger value="recipe" className="text-xs sm:text-sm">Recipe</TabsTrigger>
              <TabsTrigger value="method" className="text-xs sm:text-sm">Method</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-3 pt-3">
              <div>
                <Label className="text-sm">Drink Name *</Label>
                <Input
                  value={drinkName}
                  onChange={(e) => setDrinkName(e.target.value)}
                  placeholder="e.g., Classic Margarita"
                  className="h-9"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Technique</Label>
                  <Select value={technique} onValueChange={setTechnique}>
                    <SelectTrigger className="h-9">
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
                  <Label className="text-sm">Glass</Label>
                  <Select value={glass} onValueChange={setGlass}>
                    <SelectTrigger className="h-9">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Ice</Label>
                  <Select value={ice} onValueChange={setIce}>
                    <SelectTrigger className="h-9">
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
                  <Label className="text-sm">Garnish</Label>
                  <Input
                    value={garnish}
                    onChange={(e) => setGarnish(e.target.value)}
                    placeholder="e.g., Lime wheel"
                    className="h-9"
                  />
                </div>
              </div>

              <Card className="p-3 sm:p-4 bg-secondary/50">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 text-center">
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-primary">{metrics.totalMl}ml</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Total Volume</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-primary">{metrics.abvPercentage}%</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">ABV</div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="recipe" className="space-y-3 pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Ingredients</Label>
                <Button onClick={addIngredient} size="sm" className="h-8">
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>

              {ingredients.length === 0 ? (
                <Card className="p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">No ingredients yet</p>
                  <Button onClick={addIngredient} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Ingredient
                  </Button>
                </Card>
              ) : (
                <div className="space-y-2">
                  {ingredients.map((ing) => (
                    <Card key={ing.id} className="p-3">
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-12 sm:col-span-5">
                          <Label className="text-xs font-medium">Ingredient</Label>
                          <Input
                            value={ing.ingredient}
                            onChange={(e) => updateIngredient(ing.id, 'ingredient', e.target.value)}
                            placeholder="e.g., Tequila"
                            list="ingredient-suggestions"
                            className="h-8 text-sm"
                          />
                          <datalist id="ingredient-suggestions">
                            {Object.keys(INGREDIENT_DB).map(name => (
                              <option key={name} value={name} />
                            ))}
                          </datalist>
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <Label className="text-xs font-medium">Amount</Label>
                          <Input
                            type="number"
                            value={typeof ing.amount === 'number' ? (ing.amount === 0 ? '' : ing.amount.toString()) : ing.amount}
                            onChange={(e) => updateIngredient(ing.id, 'amount', e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-3 sm:col-span-2">
                          <Label className="text-xs font-medium">Unit</Label>
                          <Select
                            value={ing.unit}
                            onValueChange={(val) => updateIngredient(ing.id, 'unit', val)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ml">ml</SelectItem>
                              <SelectItem value="oz">oz</SelectItem>
                              <SelectItem value="dash">dash</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3 sm:col-span-2">
                          <Label className="text-xs font-medium">ABV %</Label>
                          <Input
                            type="number"
                            value={ing.abv}
                            onChange={(e) => updateIngredient(ing.id, 'abv', parseFloat(e.target.value) || 0)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeIngredient(ing.id)}
                            className="h-8 w-full"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="method" className="space-y-3 pt-3">
              <div>
                <Label className="text-sm font-semibold">Preparation Method</Label>
                <Textarea
                  value={methodSop}
                  onChange={(e) => setMethodSop(e.target.value)}
                  placeholder="Describe the step-by-step preparation method..."
                  rows={8}
                  className="text-sm resize-none"
                />
              </div>
            </TabsContent>
          </Tabs>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-3 border-t mt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="h-9">
              Cancel
            </Button>
            <Button onClick={handleSave} className="h-9">
              <Save className="mr-2 h-3 w-3" />
              Save SOP
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail View Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-xl">{selectedSOP?.drink_name}</DialogTitle>
          </DialogHeader>

          {selectedSOP && (
            <div className="space-y-4">
              <Card className="p-3 bg-secondary/50">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Technique</div>
                    <div className="font-medium text-sm">{selectedSOP.technique}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Glass</div>
                    <div className="font-medium text-sm">{selectedSOP.glass}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Ice</div>
                    <div className="font-medium text-sm">{selectedSOP.ice}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Garnish</div>
                    <div className="font-medium text-sm">{selectedSOP.garnish}</div>
                  </div>
                </div>
              </Card>

              <div>
                <h3 className="font-semibold text-sm mb-2">Recipe</h3>
                <div className="space-y-1.5">
                  {Array.isArray(selectedSOP.recipe) && selectedSOP.recipe.map((ing: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center py-1.5 px-2 bg-muted/50 rounded-sm">
                      <span className="text-sm">{ing.ingredient}</span>
                      <span className="font-medium text-sm">{ing.amount}{ing.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Card className="p-3">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{selectedSOP.total_ml}ml</div>
                    <div className="text-xs text-muted-foreground">Total Volume</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">{selectedSOP.abv_percentage}%</div>
                    <div className="text-xs text-muted-foreground">ABV</div>
                  </div>
                </div>
              </Card>

              {selectedSOP.method_sop && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Method</h3>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">{selectedSOP.method_sop}</p>
                </div>
              )}

              <Button onClick={() => exportToPDF(selectedSOP)} className="w-full h-9">
                <Download className="mr-2 h-3 w-3" />
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
