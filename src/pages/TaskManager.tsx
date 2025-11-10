import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Circle, Clock, AlertCircle, Plus, Calendar, Trash2, Edit } from "lucide-react";
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
}

interface SubscriptionStatus {
  hasAccess: boolean;
  isTrialActive: boolean;
  trialEndsAt: string | null;
  isSubscribed: boolean;
}

export default function TaskManager() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (user) {
      checkSubscriptionStatus();
      fetchTasks();
    }
  }, [user]);

  const checkSubscriptionStatus = async () => {
    if (!user) return;

    try {
      // Check if user is a founder - founders bypass subscription checks
      const { data: founderRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "founder")
        .maybeSingle();

      if (founderRole) {
        // Founder gets full access, no subscription required
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

  const handleCreateTask = async () => {
    if (!user || !title) return;

    try {
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        title,
        description,
        priority,
        due_date: dueDate || null,
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
      }

      const { error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", taskId);

      if (error) throw error;

      toast.success("Task status updated!");
      fetchTasks();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) throw error;

      toast.success("Task deleted successfully!");
      fetchTasks();
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
    setEditingTask(null);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority);
    setDueDate(task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd") : "");
    setDialogOpen(true);
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
      default: return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const filterTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status);
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
    const daysRemaining = subscriptionStatus?.trialEndsAt
      ? Math.ceil((new Date(subscriptionStatus.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;

    return (
      <div className="min-h-screen bg-background pb-20">
        <TopNav />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Subscription Required</CardTitle>
              <CardDescription className="text-base">
                {daysRemaining > 0
                  ? `Your free trial has expired. Subscribe to continue using Task Manager.`
                  : "Get started with a 7-day free trial!"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <h3 className="font-semibold">Task Manager Premium Features:</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✓ Unlimited task creation</li>
                  <li>✓ Priority management</li>
                  <li>✓ Due date tracking</li>
                  <li>✓ Progress monitoring</li>
                  <li>✓ Team collaboration</li>
                </ul>
              </div>
              <Button className="w-full" size="lg">
                Subscribe Now - $9.99/month
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                7-day free trial • Cancel anytime
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
        {/* Header with Trial Info */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Task Manager</h1>
            {subscriptionStatus?.isTrialActive && (
              <p className="text-sm text-muted-foreground mt-1">
                Trial ends {subscriptionStatus.trialEndsAt ? format(new Date(subscriptionStatus.trialEndsAt), "MMM dd, yyyy") : "soon"}
              </p>
            )}
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
                <DialogDescription>
                  {editingTask ? "Update task details" : "Add a new task to your list"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title"
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
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
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
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
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
        </div>

        {/* Tasks Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({tasks.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({filterTasksByStatus("pending").length})</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress ({filterTasksByStatus("in_progress").length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({filterTasksByStatus("completed").length})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled ({filterTasksByStatus("cancelled").length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <TaskList
              tasks={tasks}
              loading={loading}
              onStatusChange={handleStatusChange}
              onEdit={openEditDialog}
              onDelete={handleDeleteTask}
              getPriorityColor={getPriorityColor}
              getStatusIcon={getStatusIcon}
            />
          </TabsContent>

          {["pending", "in_progress", "completed", "cancelled"].map((status) => (
            <TabsContent key={status} value={status} className="mt-6">
              <TaskList
                tasks={filterTasksByStatus(status)}
                loading={loading}
                onStatusChange={handleStatusChange}
                onEdit={openEditDialog}
                onDelete={handleDeleteTask}
                getPriorityColor={getPriorityColor}
                getStatusIcon={getStatusIcon}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
}

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  onStatusChange: (taskId: string, status: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  getPriorityColor: (priority: string) => any;
  getStatusIcon: (status: string) => JSX.Element;
}

function TaskList({ tasks, loading, onStatusChange, onEdit, onDelete, getPriorityColor, getStatusIcon }: TaskListProps) {
  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading tasks...</div>;
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Circle className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No tasks found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => (
        <Card key={task.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(task.status)}
                  <Badge variant={getPriorityColor(task.priority)}>{task.priority}</Badge>
                </div>
                <CardTitle className="text-lg">{task.title}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
            )}
            
            {task.due_date && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Due: {format(new Date(task.due_date), "MMM dd, yyyy")}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Select value={task.status} onValueChange={(value: any) => onStatusChange(task.id, value)}>
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

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(task)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" className="flex-1" onClick={() => onDelete(task.id)}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}