import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Megaphone, DollarSign, Calendar, Trash2 } from "lucide-react";
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

const MarketingLaunch = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ campaign_name: "", campaign_type: "", channel: "", budget: "", status: "planning" });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["marketing-campaigns"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("marketing_campaigns").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("marketing_campaigns").insert({ ...data, budget: parseFloat(data.budget) || null, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] }); setIsDialogOpen(false); toast.success("Campaign added"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("marketing_campaigns").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["marketing-campaigns"] }); toast.success("Deleted"); },
  });

  const channels = ["Social Media", "PR", "Print", "Radio", "Email", "Influencer", "Events", "Paid Ads"];
  const totalBudget = campaigns.reduce((sum, c) => sum + (Number(c.budget) || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1"><h1 className="text-xl font-bold">Marketing Launch</h1><p className="text-sm text-muted-foreground">Grand opening campaigns</p></div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Campaign</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Campaign</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Campaign Name *</Label><Input value={formData.campaign_name} onChange={(e) => setFormData({...formData, campaign_name: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Channel</Label><Select value={formData.channel} onValueChange={(v) => setFormData({...formData, channel: v})}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{channels.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Budget ($)</Label><Input type="number" value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})} /></div>
                </div>
                <Button onClick={() => createMutation.mutate(formData)} className="w-full">Add Campaign</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <Card className="bg-pink-500/10 border-pink-500/20"><CardContent className="p-4 flex justify-between"><div><Megaphone className="w-6 h-6 text-pink-500" /><p className="text-2xl font-bold mt-2">{campaigns.length}</p><p className="text-sm text-muted-foreground">Campaigns</p></div><div className="text-right"><DollarSign className="w-6 h-6 text-green-500 ml-auto" /><p className="text-2xl font-bold mt-2">${totalBudget.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Budget</p></div></CardContent></Card>
        {campaigns.map((c) => (<Card key={c.id}><CardContent className="p-4 flex justify-between"><div><h3 className="font-medium">{c.campaign_name}</h3><div className="flex gap-2 mt-1"><Badge variant="outline">{c.channel}</Badge><Badge>{c.status}</Badge></div></div><Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="w-4 h-4" /></Button></CardContent></Card>))}
      </div>
    </div>
  );
};
export default MarketingLaunch;
