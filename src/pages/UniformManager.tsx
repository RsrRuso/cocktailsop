import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Shirt, Users, Package, Trash2 } from "lucide-react";
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

const UniformManager = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ item_name: "", department: "", supplier: "", unit_cost: "", quantity_ordered: "" });

  const { data: items = [] } = useQuery({
    queryKey: ["uniform-items"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("uniform_items").select("*").eq("user_id", user.id).order("department");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("uniform_items").insert({ ...data, unit_cost: parseFloat(data.unit_cost) || null, quantity_ordered: parseInt(data.quantity_ordered) || 0, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["uniform-items"] }); setIsDialogOpen(false); toast.success("Item added"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("uniform_items").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["uniform-items"] }); toast.success("Deleted"); },
  });

  const departments = ["FOH", "BOH", "Bar", "Management", "All Staff"];
  const totalCost = items.reduce((sum, i) => sum + ((Number(i.unit_cost) || 0) * (i.quantity_ordered || 0)), 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1"><h1 className="text-xl font-bold">Uniform Manager</h1><p className="text-sm text-muted-foreground">Staff uniforms & dress code</p></div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Item</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Uniform Item</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Item Name *</Label><Input value={formData.item_name} onChange={(e) => setFormData({...formData, item_name: e.target.value})} placeholder="e.g., Black Polo Shirt" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Department</Label><Select value={formData.department} onValueChange={(v) => setFormData({...formData, department: v})}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Supplier</Label><Input value={formData.supplier} onChange={(e) => setFormData({...formData, supplier: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Unit Cost ($)</Label><Input type="number" value={formData.unit_cost} onChange={(e) => setFormData({...formData, unit_cost: e.target.value})} /></div>
                  <div><Label>Qty Ordered</Label><Input type="number" value={formData.quantity_ordered} onChange={(e) => setFormData({...formData, quantity_ordered: e.target.value})} /></div>
                </div>
                <Button onClick={() => createMutation.mutate(formData)} className="w-full">Add Item</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <Card className="bg-violet-500/10 border-violet-500/20"><CardContent className="p-4 flex justify-between"><div><Shirt className="w-6 h-6 text-violet-500" /><p className="text-2xl font-bold mt-2">{items.length}</p><p className="text-sm text-muted-foreground">Items</p></div><div className="text-right"><Package className="w-6 h-6 text-green-500 ml-auto" /><p className="text-2xl font-bold mt-2">${totalCost.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Cost</p></div></CardContent></Card>
        {items.map((i) => (<Card key={i.id}><CardContent className="p-4 flex justify-between"><div><h3 className="font-medium">{i.item_name}</h3><div className="flex gap-2 mt-1"><Badge variant="outline">{i.department}</Badge><Badge>{i.order_status}</Badge></div></div><Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(i.id)}><Trash2 className="w-4 h-4" /></Button></CardContent></Card>))}
      </div>
    </div>
  );
};
export default UniformManager;
