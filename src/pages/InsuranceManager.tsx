import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Shield, DollarSign, Calendar, Trash2 } from "lucide-react";
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

const InsuranceManager = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ policy_type: "", provider_name: "", policy_number: "", coverage_amount: "", premium_amount: "", expiry_date: "" });

  const { data: policies = [] } = useQuery({
    queryKey: ["insurance-policies"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("insurance_policies").select("*").eq("user_id", user.id).order("expiry_date");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("insurance_policies").insert({ ...data, coverage_amount: parseFloat(data.coverage_amount) || null, premium_amount: parseFloat(data.premium_amount) || null, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["insurance-policies"] }); setIsDialogOpen(false); toast.success("Policy added"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("insurance_policies").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["insurance-policies"] }); toast.success("Deleted"); },
  });

  const types = ["General Liability", "Property", "Workers Comp", "Liquor Liability", "Business Interruption", "Cyber", "Equipment", "Auto"];
  const totalPremium = policies.reduce((sum, p) => sum + (Number(p.premium_amount) || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1"><h1 className="text-xl font-bold">Insurance Manager</h1><p className="text-sm text-muted-foreground">Policies & coverage</p></div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Policy</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Insurance Policy</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Policy Type *</Label><Select value={formData.policy_type} onValueChange={(v) => setFormData({...formData, policy_type: v})}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Provider</Label><Input value={formData.provider_name} onChange={(e) => setFormData({...formData, provider_name: e.target.value})} /></div>
                  <div><Label>Policy #</Label><Input value={formData.policy_number} onChange={(e) => setFormData({...formData, policy_number: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Coverage ($)</Label><Input type="number" value={formData.coverage_amount} onChange={(e) => setFormData({...formData, coverage_amount: e.target.value})} /></div>
                  <div><Label>Premium ($)</Label><Input type="number" value={formData.premium_amount} onChange={(e) => setFormData({...formData, premium_amount: e.target.value})} /></div>
                </div>
                <div><Label>Expiry Date</Label><Input type="date" value={formData.expiry_date} onChange={(e) => setFormData({...formData, expiry_date: e.target.value})} /></div>
                <Button onClick={() => createMutation.mutate(formData)} className="w-full">Add Policy</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <Card className="bg-blue-500/10 border-blue-500/20"><CardContent className="p-4 flex justify-between"><div><Shield className="w-6 h-6 text-blue-500" /><p className="text-2xl font-bold mt-2">{policies.length}</p><p className="text-sm text-muted-foreground">Policies</p></div><div className="text-right"><DollarSign className="w-6 h-6 text-amber-500 ml-auto" /><p className="text-2xl font-bold mt-2">${totalPremium.toLocaleString()}</p><p className="text-sm text-muted-foreground">Annual Premium</p></div></CardContent></Card>
        {policies.map((p) => (<Card key={p.id}><CardContent className="p-4 flex justify-between"><div><h3 className="font-medium">{p.policy_type}</h3><p className="text-sm text-muted-foreground">{p.provider_name}</p>{p.expiry_date && <p className="text-xs text-muted-foreground mt-1"><Calendar className="w-3 h-3 inline mr-1" />Expires: {p.expiry_date}</p>}</div><Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="w-4 h-4" /></Button></CardContent></Card>))}
      </div>
    </div>
  );
};
export default InsuranceManager;
