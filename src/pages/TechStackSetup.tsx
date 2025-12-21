import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Laptop, Wifi, CreditCard, Calendar, Trash2 } from "lucide-react";
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

const TechStackSetup = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    item_name: "",
    category: "",
    vendor: "",
    monthly_cost: "",
    setup_cost: "",
    status: "researching",
    notes: "",
  });

  const { data: items = [] } = useQuery({
    queryKey: ["tech-stack-items"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("tech_stack_items").select("*").eq("user_id", user.id).order("category", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("tech_stack_items").insert({
        ...data,
        monthly_cost: parseFloat(data.monthly_cost) || null,
        setup_cost: parseFloat(data.setup_cost) || null,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-stack-items"] });
      setIsDialogOpen(false);
      toast.success("Item added");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tech_stack_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-stack-items"] });
      toast.success("Deleted");
    },
  });

  const categories = ["POS System", "Reservation", "Inventory", "Accounting", "Payroll", "Scheduling", "Music/Streaming", "WiFi/Internet", "CCTV/Security", "Phone/VoIP", "Website", "Delivery Apps", "Marketing", "Other"];
  const totalMonthly = items.reduce((sum, i) => sum + (Number(i.monthly_cost) || 0), 0);
  const totalSetup = items.reduce((sum, i) => sum + (Number(i.setup_cost) || 0), 0);

  const statusColors: Record<string, string> = { researching: "bg-gray-500/20 text-gray-400", evaluating: "bg-amber-500/20 text-amber-400", contracted: "bg-blue-500/20 text-blue-400", active: "bg-green-500/20 text-green-400" };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Tech Stack Setup</h1>
            <p className="text-sm text-muted-foreground">POS, reservations, systems</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add System</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Tech System</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>System Name *</Label><Input value={formData.item_name} onChange={(e) => setFormData({...formData, item_name: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Category *</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Vendor</Label><Input value={formData.vendor} onChange={(e) => setFormData({...formData, vendor: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Monthly Cost ($)</Label><Input type="number" value={formData.monthly_cost} onChange={(e) => setFormData({...formData, monthly_cost: e.target.value})} /></div>
                  <div><Label>Setup Cost ($)</Label><Input type="number" value={formData.setup_cost} onChange={(e) => setFormData({...formData, setup_cost: e.target.value})} /></div>
                </div>
                <div><Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="researching">Researching</SelectItem>
                      <SelectItem value="evaluating">Evaluating</SelectItem>
                      <SelectItem value="contracted">Contracted</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} /></div>
                <Button onClick={() => createMutation.mutate(formData)} className="w-full">Add System</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-violet-500/10 border-violet-500/20">
            <CardContent className="p-3 text-center">
              <Laptop className="w-5 h-5 mx-auto text-violet-500 mb-1" />
              <p className="text-lg font-bold text-violet-400">{items.length}</p>
              <p className="text-xs text-muted-foreground">Systems</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-3 text-center">
              <Calendar className="w-5 h-5 mx-auto text-blue-500 mb-1" />
              <p className="text-lg font-bold text-blue-400">${totalMonthly.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">/month</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardContent className="p-3 text-center">
              <CreditCard className="w-5 h-5 mx-auto text-amber-500 mb-1" />
              <p className="text-lg font-bold text-amber-400">${totalSetup.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Setup</p>
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
                      <Badge className={statusColors[item.status || 'researching']}>{item.status}</Badge>
                    </div>
                    {item.vendor && <p className="text-sm text-muted-foreground mt-1">Vendor: {item.vendor}</p>}
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      {item.monthly_cost && <span>${Number(item.monthly_cost).toFixed(0)}/mo</span>}
                      {item.setup_cost && <span>Setup: ${Number(item.setup_cost).toFixed(0)}</span>}
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

export default TechStackSetup;
