import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, DollarSign, TrendingUp, TrendingDown, Calculator, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BudgetPlanner = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    subcategory: "",
    description: "",
    budget_type: "capex",
    estimated_amount: "",
    actual_amount: "",
    payment_status: "pending",
  });

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["pre-opening-budgets"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("pre_opening_budgets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("pre_opening_budgets").insert({
        ...data,
        estimated_amount: parseFloat(data.estimated_amount) || 0,
        actual_amount: parseFloat(data.actual_amount) || 0,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pre-opening-budgets"] });
      setIsDialogOpen(false);
      setFormData({ category: "", subcategory: "", description: "", budget_type: "capex", estimated_amount: "", actual_amount: "", payment_status: "pending" });
      toast.success("Budget item added");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pre_opening_budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pre-opening-budgets"] });
      toast.success("Deleted");
    },
  });

  const capexItems = budgets.filter(b => b.budget_type === "capex");
  const opexItems = budgets.filter(b => b.budget_type === "opex");
  const totalEstimated = budgets.reduce((sum, b) => sum + Number(b.estimated_amount || 0), 0);
  const totalActual = budgets.reduce((sum, b) => sum + Number(b.actual_amount || 0), 0);
  const totalVariance = totalActual - totalEstimated;

  const categories = ["Construction", "Equipment", "Furniture", "Technology", "Licensing", "Marketing", "Inventory", "Staffing", "Utilities", "Insurance", "Other"];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Budget Planner</h1>
            <p className="text-sm text-muted-foreground">CapEx & OpEx tracking</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Item</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Budget Item</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={formData.budget_type} onValueChange={(v) => setFormData({...formData, budget_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="capex">CapEx</SelectItem>
                        <SelectItem value="opex">OpEx</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Description</Label><Input value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Estimated ($)</Label><Input type="number" value={formData.estimated_amount} onChange={(e) => setFormData({...formData, estimated_amount: e.target.value})} /></div>
                  <div><Label>Actual ($)</Label><Input type="number" value={formData.actual_amount} onChange={(e) => setFormData({...formData, actual_amount: e.target.value})} /></div>
                </div>
                <Button onClick={() => createMutation.mutate(formData)} className="w-full">Add Item</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-3 text-center">
              <Calculator className="w-5 h-5 mx-auto text-blue-500 mb-1" />
              <p className="text-lg font-bold text-blue-400">${totalEstimated.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Estimated</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-3 text-center">
              <DollarSign className="w-5 h-5 mx-auto text-green-500 mb-1" />
              <p className="text-lg font-bold text-green-400">${totalActual.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Actual</p>
            </CardContent>
          </Card>
          <Card className={`${totalVariance > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
            <CardContent className="p-3 text-center">
              {totalVariance > 0 ? <TrendingUp className="w-5 h-5 mx-auto text-red-500 mb-1" /> : <TrendingDown className="w-5 h-5 mx-auto text-emerald-500 mb-1" />}
              <p className={`text-lg font-bold ${totalVariance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>${Math.abs(totalVariance).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Variance</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="capex">
          <TabsList className="w-full"><TabsTrigger value="capex" className="flex-1">CapEx ({capexItems.length})</TabsTrigger><TabsTrigger value="opex" className="flex-1">OpEx ({opexItems.length})</TabsTrigger></TabsList>
          {["capex", "opex"].map(type => (
            <TabsContent key={type} value={type} className="space-y-3 mt-3">
              {(type === "capex" ? capexItems : opexItems).map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2"><h3 className="font-medium">{item.category}</h3><Badge variant="outline">{item.payment_status}</Badge></div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <div className="flex gap-4 mt-2 text-sm">
                          <span>Est: ${Number(item.estimated_amount).toLocaleString()}</span>
                          <span>Act: ${Number(item.actual_amount).toLocaleString()}</span>
                          <span className={Number(item.variance) > 0 ? 'text-red-400' : 'text-green-400'}>Var: ${Number(item.variance).toLocaleString()}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default BudgetPlanner;
