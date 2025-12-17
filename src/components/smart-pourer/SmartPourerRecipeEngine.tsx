import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Plus, Search, RefreshCw, Edit, Trash2, Wine, Droplets, DollarSign } from 'lucide-react';

interface SmartPourerRecipeEngineProps {
  outletId: string;
}

export function SmartPourerRecipeEngine({ outletId }: SmartPourerRecipeEngineProps) {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);
  const [formData, setFormData] = useState({ cocktail_name: '', description: '', selling_price: '' });
  const [recipeItems, setRecipeItems] = useState<{ sku_id: string; ml_required: number }[]>([]);

  useEffect(() => {
    if (outletId) { fetchRecipes(); fetchSkus(); }
  }, [outletId]);

  const fetchRecipes = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.from('smart_pourer_recipes').select('*, items:smart_pourer_recipe_items(*, sku:smart_pourer_skus(*))').eq('outlet_id', outletId).order('cocktail_name');
      setRecipes(data || []);
    } catch (error) { toast.error('Failed to load recipes'); } finally { setIsLoading(false); }
  };

  const fetchSkus = async () => {
    const { data } = await supabase.from('smart_pourer_skus').select('*').eq('outlet_id', outletId).eq('is_active', true).order('name');
    setSkus(data || []);
  };

  const resetForm = () => { setFormData({ cocktail_name: '', description: '', selling_price: '' }); setRecipeItems([]); setEditingRecipe(null); };

  const addIngredient = () => setRecipeItems([...recipeItems, { sku_id: '', ml_required: 30 }]);
  const updateIngredient = (i: number, field: string, value: any) => { const u = [...recipeItems]; u[i] = { ...u[i], [field]: value }; setRecipeItems(u); };
  const removeIngredient = (i: number) => setRecipeItems(recipeItems.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!formData.cocktail_name || recipeItems.length === 0 || recipeItems.some(i => !i.sku_id)) { toast.error('Please fill required fields'); return; }
    try {
      if (editingRecipe) {
        await supabase.from('smart_pourer_recipes').update({ cocktail_name: formData.cocktail_name, description: formData.description || null, selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null }).eq('id', editingRecipe.id);
        await supabase.from('smart_pourer_recipe_items').delete().eq('recipe_id', editingRecipe.id);
        await supabase.from('smart_pourer_recipe_items').insert(recipeItems.map(i => ({ recipe_id: editingRecipe.id, sku_id: i.sku_id, ml_required: i.ml_required })));
        toast.success('Recipe updated');
      } else {
        const { data: newRecipe } = await supabase.from('smart_pourer_recipes').insert({ outlet_id: outletId, user_id: user?.id, cocktail_name: formData.cocktail_name, description: formData.description || null, selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null, is_active: true }).select().single();
        if (newRecipe) await supabase.from('smart_pourer_recipe_items').insert(recipeItems.map(i => ({ recipe_id: newRecipe.id, sku_id: i.sku_id, ml_required: i.ml_required })));
        toast.success('Recipe created');
      }
      resetForm(); setIsAddDialogOpen(false); fetchRecipes();
    } catch (error: any) { toast.error(error.message || 'Failed to save recipe'); }
  };

  const handleEdit = (recipe: any) => {
    setEditingRecipe(recipe);
    setFormData({ cocktail_name: recipe.cocktail_name, description: recipe.description || '', selling_price: recipe.selling_price?.toString() || '' });
    setRecipeItems(recipe.items?.map((i: any) => ({ sku_id: i.sku_id, ml_required: i.ml_required })) || []);
    setIsAddDialogOpen(true);
  };

  const toggleActive = async (recipe: any) => {
    await supabase.from('smart_pourer_recipes').update({ is_active: !recipe.is_active }).eq('id', recipe.id);
    toast.success(recipe.is_active ? 'Recipe deactivated' : 'Recipe activated'); fetchRecipes();
  };

  const calculateCost = (items: any[]) => items?.reduce((t, i) => t + ((i.sku?.cost_per_ml || 0) * i.ml_required), 0) || 0;
  const filteredRecipes = recipes.filter(r => r.cocktail_name?.toLowerCase().includes(searchTerm.toLowerCase()));

  if (isLoading) return <div className="flex items-center justify-center p-8">Loading recipes...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5 text-purple-500" />Recipe Engine</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchRecipes}><RefreshCw className="h-4 w-4" /></Button>
          <Dialog open={isAddDialogOpen} onOpenChange={(o) => { setIsAddDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Add Recipe</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editingRecipe ? 'Edit Recipe' : 'Create New Recipe'}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2"><Label>Recipe Name *</Label><Input placeholder="Margarita" value={formData.cocktail_name} onChange={(e) => setFormData({ ...formData, cocktail_name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Description</Label><Input placeholder="Classic lime margarita" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Selling Price ($)</Label><Input type="number" step="0.01" value={formData.selling_price} onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })} /></div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><Label>Ingredients</Label><Button variant="outline" size="sm" onClick={addIngredient}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
                  <div className="space-y-2">
                    {recipeItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                        <Select value={item.sku_id} onValueChange={(v) => updateIngredient(i, 'sku_id', v)}><SelectTrigger className="flex-1"><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent>{skus.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.spirit_type})</SelectItem>)}</SelectContent></Select>
                        <Input type="number" className="w-24" value={item.ml_required} onChange={(e) => updateIngredient(i, 'ml_required', parseInt(e.target.value) || 0)} /><span className="text-sm text-muted-foreground">ml</span>
                        <Button variant="ghost" size="icon" onClick={() => removeIngredient(i)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    ))}
                    {recipeItems.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No ingredients added yet</p>}
                  </div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button><Button onClick={handleSubmit}>{editingRecipe ? 'Update' : 'Create'}</Button></DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search recipes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5"><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{recipes.length}</p><p className="text-xs text-muted-foreground">Total Recipes</p></CardContent></Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5"><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{recipes.filter(r => r.is_active).length}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
      </div>

      {filteredRecipes.length === 0 ? (
        <Card className="bg-muted/30"><CardContent className="flex flex-col items-center justify-center py-8"><BookOpen className="h-12 w-12 text-muted-foreground mb-4" /><p className="text-muted-foreground text-center">{searchTerm ? 'No recipes match your search' : 'No recipes yet.'}</p></CardContent></Card>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 pr-4">
            {filteredRecipes.map((recipe) => {
              const totalMl = recipe.items?.reduce((s: number, i: any) => s + i.ml_required, 0) || 0;
              const cost = calculateCost(recipe.items);
              return (
                <Card key={recipe.id} className={`overflow-hidden ${!recipe.is_active ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center"><Wine className="h-5 w-5 text-purple-500" /></div>
                        <div>
                          <div className="flex items-center gap-2"><p className="font-semibold">{recipe.cocktail_name}</p>{!recipe.is_active && <Badge variant="secondary">Inactive</Badge>}</div>
                          <p className="text-xs text-muted-foreground">{recipe.items?.length || 0} ingredients</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground"><Droplets className="h-3 w-3" />{totalMl}ml</div>
                          <div className="flex items-center gap-1 text-green-500"><DollarSign className="h-3 w-3" />{cost.toFixed(2)}</div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(recipe)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(recipe)}><Trash2 className={`h-4 w-4 ${recipe.is_active ? 'text-red-500' : 'text-green-500'}`} /></Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
