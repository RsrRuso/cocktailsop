import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Zap, Wifi, Flame, Droplets, Trash2 } from "lucide-react";
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

const UtilitiesTracker = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ utility_type: "", provider_name: "", account_number: "", monthly_estimate: "", setup_status: "pending" });

  const { data: utilities = [] } = useQuery({
    queryKey: ["utilities-accounts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("utilities_accounts").select("*").eq("user_id", user.id).order("utility_type");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("utilities_accounts").insert({ ...data, monthly_estimate: parseFloat(data.monthly_estimate) || null, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["utilities-accounts"] }); setIsDialogOpen(false); toast.success("Utility added"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("utilities_accounts").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["utilities-accounts"] }); toast.success("Deleted"); },
  });

  const types = ["Electricity", "Gas", "Water", "Internet", "Phone", "Waste Management", "Pest Control"];
  const icons: Record<string, any> = { Electricity: Zap, Gas: Flame, Water: Droplets, Internet: Wifi };
  const totalMonthly = utilities.reduce((sum, u) => sum + (Number(u.monthly_estimate) || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1"><h1 className="text-xl font-bold">Utilities Tracker</h1><p className="text-sm text-muted-foreground">Account setup & costs</p></div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Utility</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Utility Account</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Utility Type *</Label><Select value={formData.utility_type} onValueChange={(v) => setFormData({...formData, utility_type: v})}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Provider</Label><Input value={formData.provider_name} onChange={(e) => setFormData({...formData, provider_name: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Account #</Label><Input value={formData.account_number} onChange={(e) => setFormData({...formData, account_number: e.target.value})} /></div>
                  <div><Label>Est. Monthly ($)</Label><Input type="number" value={formData.monthly_estimate} onChange={(e) => setFormData({...formData, monthly_estimate: e.target.value})} /></div>
                </div>
                <Button onClick={() => createMutation.mutate(formData)} className="w-full">Add Utility</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <Card className="bg-cyan-500/10 border-cyan-500/20"><CardContent className="p-4 text-center"><Zap className="w-8 h-8 mx-auto text-cyan-500" /><p className="text-2xl font-bold mt-2">${totalMonthly.toLocaleString()}</p><p className="text-sm text-muted-foreground">Est. Monthly Total</p></CardContent></Card>
        {utilities.map((u) => { const Icon = icons[u.utility_type] || Zap; return (<Card key={u.id}><CardContent className="p-4 flex justify-between items-center"><div className="flex gap-3"><Icon className="w-5 h-5 text-muted-foreground" /><div><h3 className="font-medium">{u.utility_type}</h3><p className="text-sm text-muted-foreground">{u.provider_name}</p></div></div><div className="flex items-center gap-2"><Badge>{u.setup_status}</Badge><Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(u.id)}><Trash2 className="w-4 h-4" /></Button></div></CardContent></Card>); })}
      </div>
    </div>
  );
};
export default UtilitiesTracker;
