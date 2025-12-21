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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  Plus, ClipboardCheck, Calendar, Target, CheckCircle2, 
  Circle, Clock, AlertTriangle, Building2, Trash2, Edit2
} from "lucide-react";
import { format } from "date-fns";

const departments = [
  'Operations', 'F&B', 'Kitchen', 'Bar', 'Service', 'HR', 
  'Finance', 'Marketing', 'IT', 'Facilities', 'Purchasing'
];

const venueTypes = [
  'bar', 'restaurant', 'hotel', 'cafe', 'nightclub', 
  'catering', 'ghost_kitchen', 'food_hall'
];

const PreOpeningChecklist = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewMilestone, setShowNewMilestone] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({ name: '', venue_type: 'restaurant', target_opening_date: '', description: '', location: '' });
  const [newMilestone, setNewMilestone] = useState({ name: '', description: '', due_date: '', department: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '', priority: 'medium', department: '', assigned_to: '' });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['pre-opening-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pre_opening_projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Fetch milestones for selected project
  const { data: milestones = [] } = useQuery({
    queryKey: ['pre-opening-milestones', selectedProject],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pre_opening_milestones')
        .select('*')
        .eq('project_id', selectedProject)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProject
  });

  // Fetch tasks for selected project
  const { data: tasks = [] } = useQuery({
    queryKey: ['pre-opening-tasks', selectedProject],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pre_opening_tasks')
        .select('*')
        .eq('project_id', selectedProject)
        .order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProject
  });

  // Create project mutation
  const createProject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('pre_opening_projects').insert({
        ...newProject,
        user_id: user?.id,
        target_opening_date: newProject.target_opening_date || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-opening-projects'] });
      setShowNewProject(false);
      setNewProject({ name: '', venue_type: 'restaurant', target_opening_date: '', description: '', location: '' });
      toast.success('Project created!');
    },
    onError: (e) => toast.error(e.message)
  });

  // Create milestone mutation
  const createMilestone = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('pre_opening_milestones').insert({
        ...newMilestone,
        project_id: selectedProject,
        due_date: newMilestone.due_date || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-opening-milestones'] });
      setShowNewMilestone(false);
      setNewMilestone({ name: '', description: '', due_date: '', department: '' });
      toast.success('Milestone created!');
    },
    onError: (e) => toast.error(e.message)
  });

  // Create task mutation
  const createTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('pre_opening_tasks').insert({
        ...newTask,
        project_id: selectedProject,
        milestone_id: selectedMilestone || null,
        due_date: newTask.due_date || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pre-opening-tasks'] });
      setShowNewTask(false);
      setNewTask({ title: '', description: '', due_date: '', priority: 'medium', department: '', assigned_to: '' });
      toast.success('Task created!');
    },
    onError: (e) => toast.error(e.message)
  });

  // Toggle task status
  const toggleTask = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === 'completed' ? 'pending' : 'completed';
      const { error } = await supabase
        .from('pre_opening_tasks')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pre-opening-tasks'] })
  });

  const selectedProjectData = projects.find(p => p.id === selectedProject);
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const progress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <TopNav />
      
      <div className="px-4 py-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Pre-Opening Checklist</h1>
              <p className="text-sm text-muted-foreground">Manage your venue opening projects</p>
            </div>
          </div>
          <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Project Name</Label>
                  <Input 
                    value={newProject.name} 
                    onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
                    placeholder="My New Venue"
                  />
                </div>
                <div>
                  <Label>Venue Type</Label>
                  <Select value={newProject.venue_type} onValueChange={v => setNewProject(p => ({ ...p, venue_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {venueTypes.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target Opening Date</Label>
                  <Input type="date" value={newProject.target_opening_date} onChange={e => setNewProject(p => ({ ...p, target_opening_date: e.target.value }))} />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input value={newProject.location} onChange={e => setNewProject(p => ({ ...p, location: e.target.value }))} placeholder="City, Country" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} />
                </div>
                <Button onClick={() => createProject.mutate()} disabled={!newProject.name} className="w-full">
                  Create Project
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Projects Grid */}
        {!selectedProject ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <Card 
                key={project.id} 
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                onClick={() => setSelectedProject(project.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      <CardTitle className="text-base">{project.name}</CardTitle>
                    </div>
                    <Badge variant="outline">{project.venue_type}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {project.location && <p>📍 {project.location}</p>}
                    {project.target_opening_date && (
                      <p>🎯 Opens: {format(new Date(project.target_opening_date), 'MMM d, yyyy')}</p>
                    )}
                    <Badge className="mt-2">{project.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {projects.length === 0 && (
              <Card className="col-span-full p-12 text-center">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Projects Yet</h3>
                <p className="text-muted-foreground mb-4">Create your first pre-opening project to get started</p>
                <Button onClick={() => setShowNewProject(true)}>Create Project</Button>
              </Card>
            )}
          </div>
        ) : (
          /* Project Detail View */
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => setSelectedProject(null)}>← Back</Button>
              <div>
                <h2 className="text-xl font-bold">{selectedProjectData?.name}</h2>
                <p className="text-sm text-muted-foreground">{selectedProjectData?.venue_type} • {selectedProjectData?.location}</p>
              </div>
            </div>

            {/* Progress */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm text-muted-foreground">{completedTasks}/{tasks.length} tasks</span>
                </div>
                <Progress value={progress} className="h-2" />
              </CardContent>
            </Card>

            <Tabs defaultValue="tasks">
              <TabsList>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="milestones">Milestones</TabsTrigger>
              </TabsList>

              <TabsContent value="tasks" className="space-y-4">
                <div className="flex justify-end">
                  <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Task</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div><Label>Title</Label><Input value={newTask.title} onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))} /></div>
                        <div><Label>Description</Label><Textarea value={newTask.description} onChange={e => setNewTask(t => ({ ...t, description: e.target.value }))} /></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><Label>Due Date</Label><Input type="date" value={newTask.due_date} onChange={e => setNewTask(t => ({ ...t, due_date: e.target.value }))} /></div>
                          <div>
                            <Label>Priority</Label>
                            <Select value={newTask.priority} onValueChange={v => setNewTask(t => ({ ...t, priority: v }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>Department</Label>
                          <Select value={newTask.department} onValueChange={v => setNewTask(t => ({ ...t, department: v }))}>
                            <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                            <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div><Label>Assigned To</Label><Input value={newTask.assigned_to} onChange={e => setNewTask(t => ({ ...t, assigned_to: e.target.value }))} placeholder="Name" /></div>
                        <Button onClick={() => createTask.mutate()} disabled={!newTask.title} className="w-full">Add Task</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  {tasks.map(task => (
                    <Card key={task.id} className={`${task.status === 'completed' ? 'opacity-60' : ''}`}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <button onClick={() => toggleTask.mutate({ id: task.id, status: task.status })}>
                          {task.status === 'completed' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground" />
                          )}
                        </button>
                        <div className="flex-1">
                          <p className={`font-medium ${task.status === 'completed' ? 'line-through' : ''}`}>{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {task.department && <Badge variant="outline" className="text-xs">{task.department}</Badge>}
                            {task.priority === 'high' && <Badge variant="destructive" className="text-xs">High</Badge>}
                            {task.due_date && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(task.due_date), 'MMM d')}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No tasks yet. Add your first task!</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="milestones" className="space-y-4">
                <div className="flex justify-end">
                  <Dialog open={showNewMilestone} onOpenChange={setShowNewMilestone}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Milestone</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add Milestone</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div><Label>Name</Label><Input value={newMilestone.name} onChange={e => setNewMilestone(m => ({ ...m, name: e.target.value }))} /></div>
                        <div><Label>Description</Label><Textarea value={newMilestone.description} onChange={e => setNewMilestone(m => ({ ...m, description: e.target.value }))} /></div>
                        <div><Label>Due Date</Label><Input type="date" value={newMilestone.due_date} onChange={e => setNewMilestone(m => ({ ...m, due_date: e.target.value }))} /></div>
                        <div>
                          <Label>Department</Label>
                          <Select value={newMilestone.department} onValueChange={v => setNewMilestone(m => ({ ...m, department: v }))}>
                            <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                            <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <Button onClick={() => createMilestone.mutate()} disabled={!newMilestone.name} className="w-full">Add Milestone</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-3">
                  {milestones.map(milestone => (
                    <Card key={milestone.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{milestone.name}</h4>
                            {milestone.description && <p className="text-sm text-muted-foreground">{milestone.description}</p>}
                            <div className="flex items-center gap-2 mt-2">
                              {milestone.department && <Badge variant="outline">{milestone.department}</Badge>}
                              {milestone.due_date && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Target className="w-3 h-3" />
                                  {format(new Date(milestone.due_date), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge>{milestone.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {milestones.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No milestones yet. Add your first milestone!</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default PreOpeningChecklist;
