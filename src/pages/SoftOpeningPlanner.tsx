import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, PartyPopper, Users, Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SoftOpeningPlanner = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ event_name: "", event_date: "", guest_count: "", budget: "" });

  const { data: events = [] } = useQuery({
    queryKey: ["soft-opening-events"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("soft_opening_events").select("*").eq("user_id", user.id).order("event_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("soft_opening_events").insert({ ...data, guest_count: parseInt(data.guest_count) || null, budget: parseFloat(data.budget) || null, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["soft-opening-events"] }); setIsDialogOpen(false); toast.success("Event added"); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("soft_opening_events").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["soft-opening-events"] }); toast.success("Deleted"); },
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1"><h1 className="text-xl font-bold">Soft Opening Planner</h1><p className="text-sm text-muted-foreground">Trial events & feedback</p></div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Event</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Soft Opening Event</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Event Name *</Label><Input value={formData.event_name} onChange={(e) => setFormData({...formData, event_name: e.target.value})} placeholder="e.g., Friends & Family Night" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date</Label><Input type="date" value={formData.event_date} onChange={(e) => setFormData({...formData, event_date: e.target.value})} /></div>
                  <div><Label>Guest Count</Label><Input type="number" value={formData.guest_count} onChange={(e) => setFormData({...formData, guest_count: e.target.value})} /></div>
                </div>
                <Button onClick={() => createMutation.mutate(formData)} className="w-full">Add Event</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <Card className="bg-fuchsia-500/10 border-fuchsia-500/20"><CardContent className="p-4 text-center"><PartyPopper className="w-8 h-8 mx-auto text-fuchsia-500" /><p className="text-2xl font-bold mt-2">{events.length}</p><p className="text-sm text-muted-foreground">Planned Events</p></CardContent></Card>
        {events.map((e) => (<Card key={e.id}><CardContent className="p-4 flex justify-between"><div><h3 className="font-medium">{e.event_name}</h3><div className="flex gap-2 mt-1 text-sm text-muted-foreground">{e.event_date && <span><Calendar className="w-3.5 h-3.5 inline mr-1" />{e.event_date}</span>}{e.guest_count && <span><Users className="w-3.5 h-3.5 inline mr-1" />{e.guest_count} guests</span>}</div></div><Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(e.id)}><Trash2 className="w-4 h-4" /></Button></CardContent></Card>))}
      </div>
    </div>
  );
};
export default SoftOpeningPlanner;
