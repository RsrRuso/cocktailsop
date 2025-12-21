import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, GraduationCap, Clock, Users, CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TrainingProgram = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    program_name: "",
    department: "",
    description: "",
    duration_hours: "",
    is_mandatory: false,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["training-programs"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("training_programs").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("training_programs").insert({
        ...data,
        duration_hours: parseInt(data.duration_hours) || null,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-programs"] });
      setIsDialogOpen(false);
      toast.success("Program added");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("training_programs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-programs"] });
      toast.success("Deleted");
    },
  });

  const departments = ["All Staff", "FOH", "BOH", "Bar", "Management", "Admin"];
  const mandatoryCount = programs.filter(p => p.is_mandatory).length;
  const totalHours = programs.reduce((sum, p) => sum + (p.duration_hours || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Training Program</h1>
            <p className="text-sm text-muted-foreground">Onboarding & certifications</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Program</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Training Program</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Program Name *</Label><Input value={formData.program_name} onChange={(e) => setFormData({...formData, program_name: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Department</Label>
                    <Select value={formData.department} onValueChange={(v) => setFormData({...formData, department: v})}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Duration (hours)</Label><Input type="number" value={formData.duration_hours} onChange={(e) => setFormData({...formData, duration_hours: e.target.value})} /></div>
                </div>
                <div><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} /></div>
                <div className="flex items-center gap-2">
                  <Switch checked={formData.is_mandatory} onCheckedChange={(v) => setFormData({...formData, is_mandatory: v})} />
                  <Label>Mandatory for all staff</Label>
                </div>
                <Button onClick={() => createMutation.mutate(formData)} className="w-full">Add Program</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-violet-500/10 border-violet-500/20">
            <CardContent className="p-3 text-center">
              <GraduationCap className="w-5 h-5 mx-auto text-violet-500 mb-1" />
              <p className="text-xl font-bold text-violet-400">{programs.length}</p>
              <p className="text-xs text-muted-foreground">Programs</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardContent className="p-3 text-center">
              <CheckCircle className="w-5 h-5 mx-auto text-amber-500 mb-1" />
              <p className="text-xl font-bold text-amber-400">{mandatoryCount}</p>
              <p className="text-xs text-muted-foreground">Mandatory</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="p-3 text-center">
              <Clock className="w-5 h-5 mx-auto text-blue-500 mb-1" />
              <p className="text-xl font-bold text-blue-400">{totalHours}h</p>
              <p className="text-xs text-muted-foreground">Total Hours</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          {programs.map((program) => (
            <Card key={program.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{program.program_name}</h3>
                      {program.is_mandatory && <Badge className="bg-red-500/20 text-red-400">Mandatory</Badge>}
                      <Badge variant="outline">{program.department}</Badge>
                    </div>
                    {program.description && <p className="text-sm text-muted-foreground mt-1">{program.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      {program.duration_hours && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{program.duration_hours} hours</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(program.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrainingProgram;
