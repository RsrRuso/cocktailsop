import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Package, DollarSign, Truck, CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const OpeningInventory = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    item_name: "",
    category: "",
    unit: "",
    par_level: "",
    opening_quantity: "",
    unit_cost: "",
    order_status: "pending",
  });

  const { data: items = [] } = useQuery({
    queryKey: ["opening-inventory"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("opening_inventory").select("*").eq("user_id", user.id).order("category", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("opening_inventory").insert({
        ...data,
        par_level: parseFloat(data.par_level) || null,
        opening_quantity: parseFloat(data.opening_quantity) || null,
        unit_cost: parseFloat(data.unit_cost) || null,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opening-inventory"] });
      setIsDialogOpen(false);
      toast.success("Item added");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("opening_inventory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opening-inventory"] });
      toast.success("Deleted");
    },
  });

  const categories = ["Spirits", "Wine", "Beer", "Mixers", "Garnishes", "Glassware", "Bar Tools", "Smallwares", "Cleaning", "Paper Goods", "Food", "Other"];
  const totalValue = items.reduce((sum, i) => sum + ((i.opening_quantity || 0) * (i.unit_cost || 0)), 0);
  const orderedCount = items.filter(i => i.order_status === "ordered").length;
  const receivedCount = items.filter(i => i.order_status === "received").length;

  const statusColors: Record<string, string> = { pending: "bg-amber-500/20 text-amber-400", ordered: "bg-blue-500/20 text-blue-400", received: "bg-green-500/20 text-green-400" };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Opening Inventory</h1>
            <p className="text-sm text-muted-foreground">Stock list & par levels</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Item</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Item Name *</Label><Input value={formData.item_name} onChange={(e) => setFormData({...formData, item_name: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Unit</Label><Input value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} placeholder="ea, case, bottle" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Par Level</Label><Input type="number" value={formData.par_level} onChange={(e) => setFormData({...formData, par_level: e.target.value})} /></div>
                  <div><Label>Opening Qty</Label><Input type="number" value={formData.opening_quantity} onChange={(e) => setFormData({...formData, opening_quantity: e.target.value})} /></div>
                  <div><Label>Unit Cost ($)</Label><Input type="number" value={formData.unit_cost} onChange={(e) => setFormData({...formData, unit_cost: e.target.value})} /></div>
                </div>
                <Button onClick={() => createMutation.mutate(formData)} className="w-full">Add Item</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-3 text-center">
              <Package className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{items.length}</p>
              <p className="text-xs text-muted-foreground">Items</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-3 text-center">
              <DollarSign className="w-5 h-5 mx-auto text-green-500 mb-1" />
              <p className="text-lg font-bold text-green-400">${totalValue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Value</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-3 text-center">
              <CheckCircle className="w-5 h-5 mx-auto text-blue-500 mb-1" />
              <p className="text-lg font-bold text-blue-400">{receivedCount}/{items.length}</p>
              <p className="text-xs text-muted-foreground">Received</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{item.item_name}</h3>
                      <Badge variant="outline">{item.category}</Badge>
                      <Badge className={statusColors[item.order_status || 'pending']}>{item.order_status}</Badge>
                    </div>
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Par: {item.par_level} {item.unit}</span>
                      <span>Qty: {item.opening_quantity}</span>
                      {item.unit_cost && <span>${Number(item.unit_cost).toFixed(2)}/ea</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OpeningInventory;
