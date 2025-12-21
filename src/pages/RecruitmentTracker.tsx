import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Users, Briefcase, UserCheck, Clock, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const RecruitmentTracker = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    position_title: "",
    department: "",
    employment_type: "full_time",
    positions_needed: "1",
    priority: "medium",
    description: "",
  });

  const { data: positions = [] } = useQuery({
    queryKey: ["recruitment-positions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("recruitment_positions").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("recruitment_positions").insert({
        ...data,
        positions_needed: parseInt(data.positions_needed),
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-positions"] });
      setIsDialogOpen(false);
      toast.success("Position added");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recruitment_positions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruitment-positions"] });
      toast.success("Deleted");
    },
  });

  const totalPositions = positions.reduce((sum, p) => sum + (p.positions_needed || 0), 0);
  const totalFilled = positions.reduce((sum, p) => sum + (p.positions_filled || 0), 0);
  const fillRate = totalPositions > 0 ? (totalFilled / totalPositions) * 100 : 0;

  const departments = ["FOH", "BOH", "Bar", "Management", "Admin", "Marketing", "Maintenance"];
  const priorityColors: Record<string, string> = { high: "bg-red-500/20 text-red-400", medium: "bg-amber-500/20 text-amber-400", low: "bg-green-500/20 text-green-400" };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Recruitment Tracker</h1>
            <p className="text-sm text-muted-foreground">Hiring pipeline management</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Position</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Position</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Position Title *</Label><Input value={formData.position_title} onChange={(e) => setFormData({...formData, position_title: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Department</Label>
                    <Select value={formData.department} onValueChange={(v) => setFormData({...formData, department: v})}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Positions Needed</Label><Input type="number" value={formData.positions_needed} onChange={(e) => setFormData({...formData, positions_needed: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Type</Label>
                    <Select value={formData.employment_type} onValueChange={(v) => setFormData({...formData, employment_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">Full Time</SelectItem>
                        <SelectItem value="part_time">Part Time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Priority</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={() => createMutation.mutate(formData)} className="w-full">Add Position</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Hiring Progress</span>
              <span className="text-sm text-muted-foreground">{totalFilled}/{totalPositions} filled</span>
            </div>
            <Progress value={fillRate} className="h-2" />
            <div className="grid grid-cols-3 gap-4 mt-4 text-center">
              <div><p className="text-2xl font-bold text-primary">{positions.length}</p><p className="text-xs text-muted-foreground">Open Roles</p></div>
              <div><p className="text-2xl font-bold text-amber-500">{totalPositions - totalFilled}</p><p className="text-xs text-muted-foreground">To Fill</p></div>
              <div><p className="text-2xl font-bold text-green-500">{totalFilled}</p><p className="text-xs text-muted-foreground">Hired</p></div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {positions.map((pos) => (
            <Card key={pos.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{pos.position_title}</h3>
                      <Badge variant="outline">{pos.department}</Badge>
                      <Badge className={priorityColors[pos.priority || 'medium']}>{pos.priority}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{pos.positions_filled || 0}/{pos.positions_needed} filled</span>
                      <span className="capitalize">{pos.employment_type?.replace("_", " ")}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(pos.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecruitmentTracker;
