import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Users, Building2, ChevronRight, User } from "lucide-react";

const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

const OrgChart = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [showPosition, setShowPosition] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [newDept, setNewDept] = useState({ name: '', description: '', head_name: '', head_title: '', color: '#6366f1' });
  const [newPosition, setNewPosition] = useState({ title: '', level: 1, headcount: 1, requirements: '' });

  const { data: departments = [] } = useQuery({
    queryKey: ['org-departments'],
    queryFn: async () => {
      const { data, error } = await supabase.from('org_departments').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: positions = [] } = useQuery({
    queryKey: ['org-positions', selectedDept?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('org_positions').select('*').eq('department_id', selectedDept?.id).order('level');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDept
  });

  const createDept = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('org_departments').insert({ ...newDept, user_id: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-departments'] });
      setShowNew(false);
      setNewDept({ name: '', description: '', head_name: '', head_title: '', color: '#6366f1' });
      toast.success('Department created!');
    }
  });

  const createPosition = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('org_positions').insert({ ...newPosition, department_id: selectedDept?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-positions'] });
      setShowPosition(false);
      setNewPosition({ title: '', level: 1, headcount: 1, requirements: '' });
      toast.success('Position added!');
    }
  });

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />
      <div className="px-4 py-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600"><Users className="w-6 h-6 text-white" /></div>
            <div><h1 className="text-xl font-bold">Org Chart Builder</h1><p className="text-sm text-muted-foreground">{departments.length} departments</p></div>
          </div>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Add Department</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Name</Label><Input value={newDept.name} onChange={e => setNewDept(d => ({ ...d, name: e.target.value }))} /></div>
                <div><Label>Description</Label><Textarea value={newDept.description} onChange={e => setNewDept(d => ({ ...d, description: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Head Name</Label><Input value={newDept.head_name} onChange={e => setNewDept(d => ({ ...d, head_name: e.target.value }))} /></div>
                  <div><Label>Head Title</Label><Input value={newDept.head_title} onChange={e => setNewDept(d => ({ ...d, head_title: e.target.value }))} /></div>
                </div>
                <div><Label>Color</Label><div className="flex gap-2 mt-1">{colors.map(c => (<button key={c} onClick={() => setNewDept(d => ({ ...d, color: c }))} className={`w-8 h-8 rounded-full ${newDept.color === c ? 'ring-2 ring-offset-2 ring-primary' : ''}`} style={{ backgroundColor: c }} />))}</div></div>
                <Button onClick={() => createDept.mutate()} disabled={!newDept.name} className="w-full">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!selectedDept ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map(dept => (
              <Card key={dept.id} className="cursor-pointer hover:shadow-lg transition-all" onClick={() => setSelectedDept(dept)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: dept.color }}><Building2 className="w-5 h-5 text-white" /></div>
                    <div className="flex-1"><h3 className="font-semibold">{dept.name}</h3>{dept.head_name && <p className="text-sm text-muted-foreground">{dept.head_name} - {dept.head_title}</p>}</div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
            {departments.length === 0 && <Card className="col-span-full p-12 text-center"><Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">No Departments</h3><Button onClick={() => setShowNew(true)}>Add Department</Button></Card>}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between"><Button variant="ghost" onClick={() => setSelectedDept(null)}>← Back</Button>
              <Dialog open={showPosition} onOpenChange={setShowPosition}><DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Position</Button></DialogTrigger>
                <DialogContent><DialogHeader><DialogTitle>Add Position</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Title</Label><Input value={newPosition.title} onChange={e => setNewPosition(p => ({ ...p, title: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-4"><div><Label>Level</Label><Input type="number" value={newPosition.level} onChange={e => setNewPosition(p => ({ ...p, level: parseInt(e.target.value) || 1 }))} /></div><div><Label>Headcount</Label><Input type="number" value={newPosition.headcount} onChange={e => setNewPosition(p => ({ ...p, headcount: parseInt(e.target.value) || 1 }))} /></div></div>
                    <div><Label>Requirements</Label><Textarea value={newPosition.requirements} onChange={e => setNewPosition(p => ({ ...p, requirements: e.target.value }))} /></div>
                    <Button onClick={() => createPosition.mutate()} disabled={!newPosition.title} className="w-full">Add Position</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card><CardHeader><CardTitle style={{ color: selectedDept.color }}>{selectedDept.name}</CardTitle></CardHeader><CardContent>
              {positions.length > 0 ? (<div className="space-y-2">{positions.map(pos => (<div key={pos.id} className="p-3 border rounded-lg flex items-center justify-between"><div className="flex items-center gap-3"><User className="w-5 h-5 text-muted-foreground" /><div><p className="font-medium">{pos.title}</p><p className="text-sm text-muted-foreground">Level {pos.level}</p></div></div><Badge>{pos.headcount} position{pos.headcount > 1 ? 's' : ''}</Badge></div>))}</div>) : <p className="text-center text-muted-foreground py-4">No positions yet</p>}
            </CardContent></Card>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default OrgChart;
