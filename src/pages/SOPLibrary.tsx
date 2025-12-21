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
import { Plus, FileText, Search, Tag, CheckCircle, Clock, AlertCircle } from "lucide-react";

const departments = ['Operations', 'F&B', 'Kitchen', 'Bar', 'Service', 'HR', 'Finance', 'Facilities', 'All'];
const categories = ['Opening Procedure', 'Closing Procedure', 'Service Standards', 'Safety', 'Hygiene', 'Equipment', 'Emergency', 'Training', 'Other'];

const SOPLibrary = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [selectedSOP, setSelectedSOP] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [newSOP, setNewSOP] = useState({ title: '', department: '', category: '', content: '', author: '', tags: '' });

  const { data: sops = [] } = useQuery({
    queryKey: ['sop-library'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sop_library').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const createSOP = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('sop_library').insert({
        ...newSOP,
        user_id: user?.id,
        tags: newSOP.tags ? newSOP.tags.split(',').map(t => t.trim()) : []
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sop-library'] });
      setShowNew(false);
      setNewSOP({ title: '', department: '', category: '', content: '', author: '', tags: '' });
      toast.success('SOP created!');
    }
  });

  const publishSOP = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sop_library').update({ status: 'published', effective_date: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sop-library'] });
      toast.success('SOP published!');
    }
  });

  const filteredSOPs = sops.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase());
    const matchesDept = filterDept === 'all' || s.department === filterDept;
    return matchesSearch && matchesDept;
  });

  const statusIcon = (status: string) => {
    if (status === 'published') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'review') return <Clock className="w-4 h-4 text-amber-500" />;
    return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />
      <div className="px-4 py-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600"><FileText className="w-6 h-6 text-white" /></div>
            <div><h1 className="text-xl font-bold">SOP Library</h1><p className="text-sm text-muted-foreground">{sops.length} procedures</p></div>
          </div>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Create SOP</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Create SOP</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Title</Label><Input value={newSOP.title} onChange={e => setNewSOP(s => ({ ...s, title: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Department</Label><Select value={newSOP.department} onValueChange={v => setNewSOP(s => ({ ...s, department: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Category</Label><Select value={newSOP.category} onValueChange={v => setNewSOP(s => ({ ...s, category: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div><Label>Content</Label><Textarea value={newSOP.content} onChange={e => setNewSOP(s => ({ ...s, content: e.target.value }))} rows={8} placeholder="Write your procedure steps here..." /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Author</Label><Input value={newSOP.author} onChange={e => setNewSOP(s => ({ ...s, author: e.target.value }))} /></div>
                  <div><Label>Tags (comma-separated)</Label><Input value={newSOP.tags} onChange={e => setNewSOP(s => ({ ...s, tags: e.target.value }))} placeholder="safety, training" /></div>
                </div>
                <Button onClick={() => createSOP.mutate()} disabled={!newSOP.title || !newSOP.content} className="w-full">Create SOP</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search SOPs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
          <Select value={filterDept} onValueChange={setFilterDept}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Depts</SelectItem>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
        </div>

        {!selectedSOP ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSOPs.map(sop => (
              <Card key={sop.id} className="cursor-pointer hover:shadow-lg transition-all" onClick={() => setSelectedSOP(sop)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">{statusIcon(sop.status)}<h3 className="font-semibold">{sop.title}</h3></div>
                      <div className="flex items-center gap-2 mt-2">{sop.department && <Badge variant="outline">{sop.department}</Badge>}{sop.category && <Badge variant="secondary">{sop.category}</Badge>}</div>
                      {sop.tags?.length > 0 && <div className="flex gap-1 mt-2 flex-wrap">{sop.tags.map((t: string) => <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded">{t}</span>)}</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredSOPs.length === 0 && <Card className="col-span-full p-12 text-center"><FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><h3 className="font-semibold mb-2">No SOPs Found</h3><Button onClick={() => setShowNew(true)}>Create SOP</Button></Card>}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between"><Button variant="ghost" onClick={() => setSelectedSOP(null)}>← Back</Button>
              {selectedSOP.status !== 'published' && <Button onClick={() => publishSOP.mutate(selectedSOP.id)}>Publish SOP</Button>}
            </div>
            <Card><CardHeader><div className="flex items-center justify-between"><CardTitle>{selectedSOP.title}</CardTitle><Badge>{selectedSOP.status}</Badge></div><div className="flex gap-2 mt-2">{selectedSOP.department && <Badge variant="outline">{selectedSOP.department}</Badge>}{selectedSOP.category && <Badge variant="secondary">{selectedSOP.category}</Badge>}</div></CardHeader>
              <CardContent><div className="prose prose-sm max-w-none whitespace-pre-wrap">{selectedSOP.content}</div>{selectedSOP.author && <p className="text-sm text-muted-foreground mt-4">Author: {selectedSOP.author}</p>}</CardContent>
            </Card>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default SOPLibrary;
