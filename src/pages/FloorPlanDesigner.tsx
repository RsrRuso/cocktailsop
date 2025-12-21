import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Layout, Users, Square, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FloorPlanDesigner = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    layout_name: "",
    area_type: "",
    total_capacity: "",
    notes: "",
  });

  const { data: layouts = [] } = useQuery({
    queryKey: ["floor-plan-layouts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("floor_plan_layouts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("floor_plan_layouts").insert({
        ...data,
        total_capacity: parseInt(data.total_capacity) || null,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["floor-plan-layouts"] });
      setIsDialogOpen(false);
      toast.success("Layout added");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("floor_plan_layouts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["floor-plan-layouts"] });
      toast.success("Deleted");
    },
  });

  const areaTypes = ["Dining Room", "Bar Area", "Kitchen", "Storage", "Outdoor Patio", "Private Dining", "Entrance/Host", "Restrooms", "Office"];
  const totalCapacity = layouts.reduce((sum, l) => sum + (l.total_capacity || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Floor Plan Designer</h1>
            <p className="text-sm text-muted-foreground">Layout & capacity planning</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Layout</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Floor Layout</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Layout Name *</Label><Input value={formData.layout_name} onChange={(e) => setFormData({...formData, layout_name: e.target.value})} placeholder="e.g., Main Dining Area" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Area Type</Label>
                    <Select value={formData.area_type} onValueChange={(v) => setFormData({...formData, area_type: v})}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{areaTypes.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Capacity</Label><Input type="number" value={formData.total_capacity} onChange={(e) => setFormData({...formData, total_capacity: e.target.value})} placeholder="Seats" /></div>
                </div>
                <div><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} /></div>
                <Button onClick={() => createMutation.mutate(formData)} className="w-full">Add Layout</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-indigo-500/10 border-indigo-500/20">
            <CardContent className="p-4 text-center">
              <Layout className="w-6 h-6 mx-auto text-indigo-500 mb-1" />
              <p className="text-2xl font-bold text-indigo-400">{layouts.length}</p>
              <p className="text-sm text-muted-foreground">Areas</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-500/10 border-emerald-500/20">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
              <p className="text-2xl font-bold text-emerald-400">{totalCapacity}</p>
              <p className="text-sm text-muted-foreground">Total Capacity</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          {layouts.map((layout) => (
            <Card key={layout.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{layout.layout_name}</h3>
                      {layout.area_type && <Badge variant="outline">{layout.area_type}</Badge>}
                    </div>
                    {layout.notes && <p className="text-sm text-muted-foreground mt-1">{layout.notes}</p>}
                    {layout.total_capacity && <div className="flex items-center gap-1 mt-2 text-sm"><Users className="w-3.5 h-3.5" />{layout.total_capacity} seats</div>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(layout.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FloorPlanDesigner;
