import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, UtensilsCrossed, ChevronRight, DollarSign, Percent, FolderOpen, Tag } from "lucide-react";

const MenuBuilder = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNewDept, setShowNewDept] = useState(false);
  const [showNewCat, setShowNewCat] = useState(false);
  const [showNewItem, setShowNewItem] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [selectedCat, setSelectedCat] = useState<any>(null);
  const [newDept, setNewDept] = useState({ name: '', description: '' });
  const [newCat, setNewCat] = useState({ name: '', description: '' });
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', cost: '', allergens: '', dietary_tags: '' });

  const { data: departments = [] } = useQuery({
    queryKey: ['menu-departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('menu_departments').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['menu-categories', selectedDept?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('menu_categories').select('*').eq('department_id', selectedDept?.id).order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDept
  });

  const { data: items = [] } = useQuery({
    queryKey: ['menu-builder-items', selectedCat?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('menu_builder_items').select('*').eq('category_id', selectedCat?.id).order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCat
  });

  const createDept = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('menu_departments').insert({ ...newDept, user_id: user?.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['menu-departments'] }); setShowNewDept(false); setNewDept({ name: '', description: '' }); toast.success('Department created!'); }
  });

  const createCat = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('menu_categories').insert({ ...newCat, department_id: selectedDept?.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['menu-categories'] }); setShowNewCat(false); setNewCat({ name: '', description: '' }); toast.success('Category created!'); }
  });

  const createItem = useMutation({
    mutationFn: async () => {
      const price = parseFloat(newItem.price) || 0;
      const cost = parseFloat(newItem.cost) || 0;
      const food_cost_percentage = price > 0 ? (cost / price) * 100 : 0;
      const { error } = await supabase.from('menu_builder_items').insert({
        ...newItem,
        category_id: selectedCat?.id,
        user_id: user?.id,
        price,
        cost,
        food_cost_percentage,
        allergens: newItem.allergens ? newItem.allergens.split(',').map(a => a.trim()) : [],
        dietary_tags: newItem.dietary_tags ? newItem.dietary_tags.split(',').map(t => t.trim()) : []
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['menu-builder-items'] }); setShowNewItem(false); setNewItem({ name: '', description: '', price: '', cost: '', allergens: '', dietary_tags: '' }); toast.success('Item added!'); }
  });

  // Navigation breadcrumb
  const renderBreadcrumb = () => (
    <div className="flex items-center gap-2 text-sm">
      <button onClick={() => { setSelectedDept(null); setSelectedCat(null); }} className="text-primary hover:underline">Menu</button>
      {selectedDept && <><ChevronRight className="w-4 h-4" /><button onClick={() => setSelectedCat(null)} className="text-primary hover:underline">{selectedDept.name}</button></>}
      {selectedCat && <><ChevronRight className="w-4 h-4" /><span>{selectedCat.name}</span></>}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />
      <div className="px-4 py-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600"><UtensilsCrossed className="w-6 h-6 text-white" /></div>
            <div><h1 className="text-xl font-bold">Menu Builder Pro</h1>{renderBreadcrumb()}</div>
          </div>
        </div>

        {/* Departments Level */}
        {!selectedDept && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showNewDept} onOpenChange={setShowNewDept}>
                <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Add Department</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>Add Menu Department</DialogTitle></DialogHeader>
                  <div className="space-y-4"><div><Label>Name</Label><Input value={newDept.name} onChange={e => setNewDept(d => ({ ...d, name: e.target.value }))} placeholder="e.g., Food, Beverages, Desserts" /></div><div><Label>Description</Label><Textarea value={newDept.description} onChange={e => setNewDept(d => ({ ...d, description: e.target.value }))} /></div><Button onClick={() => createDept.mutate()} disabled={!newDept.name} className="w-full">Create</Button></div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map(dept => (
                <Card key={dept.id} className="cursor-pointer hover:shadow-lg transition-all" onClick={() => setSelectedDept(dept)}>
                  <CardContent className="p-4 flex items-center justify-between"><div><h3 className="font-semibold">{dept.name}</h3>{dept.description && <p className="text-sm text-muted-foreground">{dept.description}</p>}</div><ChevronRight className="w-5 h-5 text-muted-foreground" /></CardContent>
                </Card>
              ))}
              {departments.length === 0 && <Card className="col-span-full p-12 text-center"><FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">No Departments</h3><p className="text-muted-foreground mb-4">Create departments like Food, Beverages, etc.</p><Button onClick={() => setShowNewDept(true)}>Add Department</Button></Card>}
            </div>
          </div>
        )}

        {/* Categories Level */}
        {selectedDept && !selectedCat && (
          <div className="space-y-4">
            <div className="flex justify-between"><Button variant="ghost" onClick={() => setSelectedDept(null)}>← Back</Button>
              <Dialog open={showNewCat} onOpenChange={setShowNewCat}>
                <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Add Category</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>Add Category to {selectedDept.name}</DialogTitle></DialogHeader>
                  <div className="space-y-4"><div><Label>Name</Label><Input value={newCat.name} onChange={e => setNewCat(c => ({ ...c, name: e.target.value }))} placeholder="e.g., Appetizers, Mains" /></div><div><Label>Description</Label><Textarea value={newCat.description} onChange={e => setNewCat(c => ({ ...c, description: e.target.value }))} /></div><Button onClick={() => createCat.mutate()} disabled={!newCat.name} className="w-full">Create</Button></div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(cat => (
                <Card key={cat.id} className="cursor-pointer hover:shadow-lg transition-all" onClick={() => setSelectedCat(cat)}>
                  <CardContent className="p-4 flex items-center justify-between"><div><h3 className="font-semibold">{cat.name}</h3></div><ChevronRight className="w-5 h-5 text-muted-foreground" /></CardContent>
                </Card>
              ))}
              {categories.length === 0 && <Card className="col-span-full p-8 text-center"><p className="text-muted-foreground">No categories yet</p></Card>}
            </div>
          </div>
        )}

        {/* Items Level */}
        {selectedCat && (
          <div className="space-y-4">
            <div className="flex justify-between"><Button variant="ghost" onClick={() => setSelectedCat(null)}>← Back</Button>
              <Dialog open={showNewItem} onOpenChange={setShowNewItem}>
                <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Add Item</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>Add Menu Item</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Name</Label><Input value={newItem.name} onChange={e => setNewItem(i => ({ ...i, name: e.target.value }))} /></div>
                    <div><Label>Description</Label><Textarea value={newItem.description} onChange={e => setNewItem(i => ({ ...i, description: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-4"><div><Label>Price ($)</Label><Input type="number" value={newItem.price} onChange={e => setNewItem(i => ({ ...i, price: e.target.value }))} /></div><div><Label>Cost ($)</Label><Input type="number" value={newItem.cost} onChange={e => setNewItem(i => ({ ...i, cost: e.target.value }))} /></div></div>
                    <div><Label>Allergens (comma-separated)</Label><Input value={newItem.allergens} onChange={e => setNewItem(i => ({ ...i, allergens: e.target.value }))} placeholder="gluten, dairy, nuts" /></div>
                    <div><Label>Dietary Tags (comma-separated)</Label><Input value={newItem.dietary_tags} onChange={e => setNewItem(i => ({ ...i, dietary_tags: e.target.value }))} placeholder="vegan, vegetarian, gf" /></div>
                    <Button onClick={() => createItem.mutate()} disabled={!newItem.name} className="w-full">Add Item</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map(item => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div><h3 className="font-semibold">{item.name}</h3>{item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}</div>
                      <div className="text-right"><p className="font-bold text-lg">${item.price?.toFixed(2)}</p>{item.food_cost_percentage && <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><Percent className="w-3 h-3" />{item.food_cost_percentage.toFixed(1)}% FC</p>}</div>
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">{item.allergens?.map((a: string) => <Badge key={a} variant="destructive" className="text-xs">{a}</Badge>)}{item.dietary_tags?.map((t: string) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div>
                  </CardContent>
                </Card>
              ))}
              {items.length === 0 && <Card className="col-span-full p-8 text-center"><p className="text-muted-foreground">No items yet</p></Card>}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default MenuBuilder;
