import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, ShieldCheck, AlertTriangle, CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const HealthSafetyAudit = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ category: "", item_name: "", description: "", is_compliant: false, priority: "medium" });

  const { data: items = [] } = useQuery({
    queryKey: ["safety-audit-items"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("safety_audit_items").select("*").eq("user_id", user.id).order("category");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("safety_audit_items").insert({ ...data, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["safety-audit-items"] }); setIsDialogOpen(false); toast.success("Item added"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("safety_audit_items").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["safety-audit-items"] }); toast.success("Deleted"); },
  });

  const categories = ["HACCP", "Fire Safety", "First Aid", "Electrical", "Gas Safety", "Ventilation", "Pest Control", "Food Storage", "Hygiene", "Emergency Exits", "Signage"];
  const compliantCount = items.filter(i => i.is_compliant).length;
  const compliance = items.length > 0 ? Math.round((compliantCount / items.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1"><h1 className="text-xl font-bold">Health & Safety Audit</h1><p className="text-sm text-muted-foreground">Compliance checklist</p></div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Item</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Audit Item</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Category *</Label><Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Item Name *</Label><Input value={formData.item_name} onChange={(e) => setFormData({...formData, item_name: e.target.value})} placeholder="e.g., Fire extinguisher inspection" /></div>
                <div><Label>Description</Label><Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Priority</Label><Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select></div>
                  <div className="flex items-center gap-2 pt-6"><Switch checked={formData.is_compliant} onCheckedChange={(v) => setFormData({...formData, is_compliant: v})} /><Label>Compliant</Label></div>
                </div>
                <Button onClick={() => createMutation.mutate(formData)} className="w-full">Add Item</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <Card className={`${compliance >= 80 ? 'bg-green-500/10 border-green-500/20' : compliance >= 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'}`}><CardContent className="p-4 text-center"><ShieldCheck className={`w-8 h-8 mx-auto ${compliance >= 80 ? 'text-green-500' : compliance >= 50 ? 'text-amber-500' : 'text-red-500'}`} /><p className="text-3xl font-bold mt-2">{compliance}%</p><p className="text-sm text-muted-foreground">Compliance ({compliantCount}/{items.length})</p></CardContent></Card>
        {items.map((i) => (<Card key={i.id}><CardContent className="p-4 flex justify-between items-center"><div className="flex gap-3">{i.is_compliant ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}<div><h3 className="font-medium">{i.item_name}</h3><div className="flex gap-2 mt-1"><Badge variant="outline">{i.category}</Badge><Badge className={i.priority === 'high' ? 'bg-red-500/20 text-red-400' : i.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}>{i.priority}</Badge></div></div></div><Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(i.id)}><Trash2 className="w-4 h-4" /></Button></CardContent></Card>))}
      </div>
    </div>
  );
};
export default HealthSafetyAudit;
