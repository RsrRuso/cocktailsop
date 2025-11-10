import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  CheckCircle2, Circle, Clock, AlertCircle, Plus, Calendar, Trash2, Edit, 
  Filter, Search, BarChart3, TrendingUp, MessageSquare, Activity, Tag,
  Paperclip, Users, ChevronRight, Target, Timer, FolderOpen
} from "lucide-react";
import { format } from "date-fns";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  category: string;
  tags: string[];
  progress: number;
  estimated_hours: number | null;
  actual_hours: number | null;
}

interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string;
  };
}

interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  details: any;
  created_at: string;
  profiles?: {
    username: string;
  };
}

interface SubscriptionStatus {
  hasAccess: boolean;
  isTrialActive: boolean;
  trialEndsAt: string | null;
  isSubscribed: boolean;
}

interface Stats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

const CATEGORIES = [
  "Development",
  "Design",
  "Marketing",
  "Sales",
  "Support",
  "Operations",
  "General"
];

export default function TaskManager() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [newComment, setNewComment] = useState("");
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    completionRate: 0
  });

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("General");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [estimatedHours, setEstimatedHours] = useState("");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "board">("list");

  useEffect(() => {
    if (user) {
      checkSubscriptionStatus();
      fetchTasks();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [tasks, searchQuery, filterCategory, filterPriority]);

  useEffect(() => {
    calculateStats();
  }, [tasks]);

  const checkSubscriptionStatus = async () => {
    if (!user) return;

    try {
      const { data: founderRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "founder")
        .maybeSingle();

      if (founderRole) {
        setSubscriptionStatus({
          hasAccess: true,
          isTrialActive: false,
          trialEndsAt: null,
          isSubscribed: true,
        });
        return;
      }

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      const now = new Date();
      const trialEnds = data?.trial_ends_at ? new Date(data.trial_ends_at) : null;
      const subscriptionEnds = data?.subscription_ends_at ? new Date(data.subscription_ends_at) : null;

      const isTrialActive = trialEnds ? trialEnds > now : false;
      const isSubscribed = data?.status === "active" && (!subscriptionEnds || subscriptionEnds > now);
      const hasAccess = isTrialActive || isSubscribed;

      setSubscriptionStatus({
        hasAccess,
        isTrialActive,
        trialEndsAt: data?.trial_ends_at || null,
        isSubscribed,
      });
    } catch (error: any) {
      console.error("Error checking subscription:", error);
      toast.error("Failed to check subscription status");
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskDetails = async (taskId: string) => {
    try {
      const [commentsRes, activitiesRes] = await Promise.all([
        supabase
          .from("task_comments")
          .select("*")
          .eq("task_id", taskId)
          .order("created_at", { ascending: true }),
        supabase
          .from("task_activity")
          .select("*")
          .eq("task_id", taskId)
          .order("created_at", { ascending: false })
      ]);

      if (commentsRes.data) setComments(commentsRes.data as any);
      if (activitiesRes.data) setActivities(activitiesRes.data as any);
    } catch (error: any) {
      console.error("Error fetching task details:", error);
    }
  };

  const calculateStats = () => {
    const now = new Date();
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === "pending").length;
    const inProgress = tasks.filter(t => t.status === "in_progress").length;
    const completed = tasks.filter(t => t.status === "completed").length;
    const overdue = tasks.filter(t => 
      t.due_date && new Date(t.due_date) < now && t.status !== "completed"
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    setStats({ total, pending, inProgress, completed, overdue, completionRate });
  };

  const applyFilters = () => {
    let filtered = [...tasks];

    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (filterCategory !== "all") {
      filtered = filtered.filter(task => task.category === filterCategory);
    }

    if (filterPriority !== "all") {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    setFilteredTasks(filtered);
  };

  const handleCreateTask = async () => {
    if (!user || !title) {
      toast.error("Please fill in the task title");
      return;
    }

    try {
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        title,
        description,
        priority,
        due_date: dueDate || null,
        category,
        tags,
        progress,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Task created successfully!");
      setDialogOpen(false);
      resetForm();
      fetchTasks();
    } catch (error: any) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          title,
          description,
          priority,
          due_date: dueDate || null,
          category,
          tags,
          progress,
          estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
        })
        .eq("id", editingTask.id);

      if (error) throw error;

      toast.success("Task updated successfully!");
      setDialogOpen(false);
      resetForm();
      fetchTasks();
    } catch (error: any) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
        updateData.progress = 100;
      }

      const { error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", taskId);

      if (error) throw error;

      toast.success("Task status updated!");
      fetchTasks();
      if (selectedTask?.id === taskId) {
        fetchTaskDetails(taskId);
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleProgressUpdate = async (taskId: string, newProgress: number) => {
    try {
      const updateData: any = { progress: newProgress };
      
      if (newProgress === 100) {
        updateData.status = "completed";
        updateData.completed_at = new Date().toISOString();
      } else if (newProgress > 0 && newProgress < 100) {
        updateData.status = "in_progress";
      }

      const { error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", taskId);

      if (error) throw error;

      toast.success("Progress updated!");
      fetchTasks();
    } catch (error: any) {
      console.error("Error updating progress:", error);
      toast.error("Failed to update progress");
    }
  };

  const handleAddComment = async () => {
    if (!selectedTask || !newComment.trim()) return;

    try {
      const { error } = await supabase.from("task_comments").insert({
        task_id: selectedTask.id,
        user_id: user!.id,
        content: newComment,
      });

      if (error) throw error;

      toast.success("Comment added!");
      setNewComment("");
      fetchTaskDetails(selectedTask.id);
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) throw error;

      toast.success("Task deleted successfully!");
      fetchTasks();
      if (detailsOpen) setDetailsOpen(false);
    } catch (error: any) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueDate("");
    setCategory("General");
    setTags([]);
    setTagInput("");
    setProgress(0);
    setEstimatedHours("");
    setEditingTask(null);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
    setDueDate(task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd") : "");
    setCategory(task.category || "General");
    setTags(task.tags || []);
    setProgress(task.progress || 0);
    setEstimatedHours(task.estimated_hours?.toString() || "");
    setDialogOpen(true);
  };

  const openTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setDetailsOpen(true);
    fetchTaskDetails(task.id);
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "default";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "in_progress": return <Clock className="w-4 h-4 text-blue-500" />;
      case "cancelled": return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default: return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const filterTasksByStatus = (status: string) => {
    return filteredTasks.filter((task) => task.status === status);
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && selectedTask?.status !== "completed";
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access Task Manager</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!subscriptionStatus?.hasAccess) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <TopNav />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Upgrade to Professional</CardTitle>
              <CardDescription className="text-base">
                Get access to advanced task management features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Premium Features
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Unlimited tasks & categories
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Team collaboration & assignments
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Progress tracking & analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Comments & activity logs
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Time tracking & estimates
                  </li>
                </ul>
              </div>
              <Button className="w-full" size="lg">
                Start 7-Day Free Trial
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Then $9.99/month • Cancel anytime
              </p>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">Total Tasks</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs flex items-center gap-1">
                <Circle className="w-3 h-3" /> Pending
              </CardDescription>
              <CardTitle className="text-2xl">{stats.pending}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" /> In Progress
              </CardDescription>
              <CardTitle className="text-2xl">{stats.inProgress}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Completed
              </CardDescription>
              <CardTitle className="text-2xl">{stats.completed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Overdue
              </CardDescription>
              <CardTitle className="text-2xl text-destructive">{stats.overdue}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs flex items-center gap-1">
                <BarChart3 className="w-3 h-3" /> Completion
              </CardDescription>
              <CardTitle className="text-2xl">{stats.completionRate}%</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Header with Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Target className="w-8 h-8" />
              Task Manager Pro
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your tasks efficiently
            </p>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <FolderOpen className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="all">
              All <Badge variant="secondary" className="ml-1">{filteredTasks.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending <Badge variant="secondary" className="ml-1">{filterTasksByStatus("pending").length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="in_progress">
              In Progress <Badge variant="secondary" className="ml-1">{filterTasksByStatus("in_progress").length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed <Badge variant="secondary" className="ml-1">{filterTasksByStatus("completed").length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled <Badge variant="secondary" className="ml-1">{filterTasksByStatus("cancelled").length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <TaskList
              tasks={filteredTasks}
              loading={loading}
              onStatusChange={handleStatusChange}
              onProgressUpdate={handleProgressUpdate}
              onEdit={openEditDialog}
              onDelete={handleDeleteTask}
              onViewDetails={openTaskDetails}
              getPriorityColor={getPriorityColor}
              getStatusIcon={getStatusIcon}
            />
          </TabsContent>

          {["pending", "in_progress", "completed", "cancelled"].map((status) => (
            <TabsContent key={status} value={status}>
              <TaskList
                tasks={filterTasksByStatus(status)}
                loading={loading}
                onStatusChange={handleStatusChange}
                onProgressUpdate={handleProgressUpdate}
                onEdit={openEditDialog}
                onDelete={handleDeleteTask}
                onViewDetails={openTaskDetails}
                getPriorityColor={getPriorityColor}
                getStatusIcon={getStatusIcon}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Create/Edit Task Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
            <DialogDescription>
              {editingTask ? "Update task details" : "Add a new task to your workflow"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter task title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Task description (optional)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_hours">Estimated Hours</Label>
                <Input
                  id="estimated_hours"
                  type="number"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="0.0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="progress">Progress (%)</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="progress"
                  type="number"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => setProgress(parseInt(e.target.value) || 0)}
                  className="w-20"
                />
                <Progress value={progress} className="flex-1" />
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  placeholder="Add tag and press Enter"
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={editingTask ? handleUpdateTask : handleCreateTask}>
              {editingTask ? "Update Task" : "Create Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-xl pr-8">{selectedTask.title}</DialogTitle>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {getStatusIcon(selectedTask.status)}
                      <Badge variant={getPriorityColor(selectedTask.priority)}>
                        {selectedTask.priority}
                      </Badge>
                      <Badge variant="outline">
                        <FolderOpen className="w-3 h-3 mr-1" />
                        {selectedTask.category}
                      </Badge>
                      {selectedTask.due_date && (
                        <Badge variant={isOverdue(selectedTask.due_date) ? "destructive" : "outline"}>
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(selectedTask.due_date), "MMM dd, yyyy")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(selectedTask)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteTask(selectedTask.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6 py-4">
                  {/* Description */}
                  {selectedTask.description && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                    </div>
                  )}

                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold">Progress</h4>
                      <span className="text-sm text-muted-foreground">{selectedTask.progress}%</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Progress value={selectedTask.progress} className="flex-1" />
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={selectedTask.progress}
                        onChange={(e) => handleProgressUpdate(selectedTask.id, parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Status</h4>
                    <Select 
                      value={selectedTask.status} 
                      onValueChange={(value) => handleStatusChange(selectedTask.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tags */}
                  {selectedTask.tags && selectedTask.tags.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        Tags
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTask.tags.map(tag => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Time Tracking */}
                  {(selectedTask.estimated_hours || selectedTask.actual_hours) && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Timer className="w-4 h-4" />
                        Time Tracking
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedTask.estimated_hours && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Estimated:</span>{" "}
                            <span className="font-medium">{selectedTask.estimated_hours}h</span>
                          </div>
                        )}
                        {selectedTask.actual_hours && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Actual:</span>{" "}
                            <span className="font-medium">{selectedTask.actual_hours}h</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Activity Log */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Activity Log
                    </h4>
                    <div className="space-y-3">
                      {activities.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No activity yet</p>
                      ) : (
                        activities.map(activity => (
                          <div key={activity.id} className="flex items-start gap-3 text-sm">
                            <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                            <div className="flex-1">
                              <p>
                                <span className="font-medium">{activity.profiles?.username || "User"}</span>{" "}
                                {activity.action.replace(/_/g, " ")}
                                {activity.details && (
                                  <span className="text-muted-foreground">
                                    {" "}- {JSON.stringify(activity.details)}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(activity.created_at), "MMM dd, yyyy 'at' HH:mm")}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Comments */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Comments ({comments.length})
                    </h4>
                    <div className="space-y-4">
                      {comments.map(comment => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium">
                              {comment.profiles?.username?.[0].toUpperCase() || "U"}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">
                                {comment.profiles?.username || "User"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(comment.created_at), "MMM dd, HH:mm")}
                              </span>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Input
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleAddComment()}
                      />
                      <Button onClick={handleAddComment}>
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  onStatusChange: (taskId: string, status: string) => void;
  onProgressUpdate: (taskId: string, progress: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onViewDetails: (task: Task) => void;
  getPriorityColor: (priority: string) => any;
  getStatusIcon: (status: string) => JSX.Element;
}

function TaskList({ 
  tasks, 
  loading, 
  onStatusChange, 
  onProgressUpdate,
  onEdit, 
  onDelete, 
  onViewDetails,
  getPriorityColor, 
  getStatusIcon 
}: TaskListProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Target className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">No tasks found</p>
          <p className="text-sm text-muted-foreground">Create your first task to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => {
        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
        
        return (
          <Card 
            key={task.id} 
            className="hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
            onClick={() => onViewDetails(task)}
          >
            {isOverdue && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-destructive"></div>
            )}
            
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {getStatusIcon(task.status)}
                    <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                      {task.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <FolderOpen className="w-3 h-3 mr-1" />
                      {task.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-2">
                    {task.title}
                  </CardTitle>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {task.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
              )}
              
              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Progress</span>
                  <span className="text-xs font-medium">{task.progress}%</span>
                </div>
                <Progress value={task.progress} className="h-2" />
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {task.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {task.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{task.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Due Date & Time */}
              <div className="flex items-center justify-between text-xs">
                {task.due_date && (
                  <div className={`flex items-center gap-1 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                    <Calendar className="w-3 h-3" />
                    {format(new Date(task.due_date), "MMM dd, yyyy")}
                  </div>
                )}
                {task.estimated_hours && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Timer className="w-3 h-3" />
                    {task.estimated_hours}h
                  </div>
                )}
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                  }}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newStatus = task.status === "completed" ? "in_progress" : "completed";
                    onStatusChange(task.id, newStatus);
                  }}
                  className="flex-1 text-xs"
                >
                  {task.status === "completed" ? (
                    <>
                      <Circle className="w-3 h-3 mr-1" />
                      Reopen
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Complete
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}