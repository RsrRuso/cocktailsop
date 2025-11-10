import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useInAppNotifications } from "@/hooks/useInAppNotifications";
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
  Paperclip, Users, ChevronRight, Target, Timer, FolderOpen, Bell, UserPlus,
  Settings, Shield, Eye, EyeOff, GitBranch, Copy, Link2, PlayCircle, PauseCircle,
  CheckSquare, Square, Layers, GanttChart, Folder, PieChart
} from "lucide-react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  team_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  category: string;
  tags: string[];
  progress: number;
  estimated_hours: number | null;
  actual_hours: number | null;
  parent_task_id: string | null;
  task_number: string | null;
  watchers: string[] | null;
  deadline: string | null;
  time_tracking: { spent: number; estimated: number } | null;
  checklist: Array<{ id: string; text: string; completed: boolean }> | null;
  dependencies: string[] | null;
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  profiles?: {
    username: string;
    avatar_url: string;
  };
}

interface Reminder {
  id: string;
  task_id: string;
  user_id: string;
  remind_at: string;
  sent: boolean;
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

interface TimeLog {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  description: string | null;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string;
  };
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
  const navigate = useNavigate();
  const { showNotification } = useInAppNotifications();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [manageMembersOpen, setManageMembersOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newComment, setNewComment] = useState("");
  
  // Time tracking state
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [activeTimer, setActiveTimer] = useState<TimeLog | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timeTrackingDialogOpen, setTimeTrackingDialogOpen] = useState(false);
  const [timeReportsDialogOpen, setTimeReportsDialogOpen] = useState(false);
  const [manualTimeDescription, setManualTimeDescription] = useState("");
  const [manualTimeHours, setManualTimeHours] = useState("");
  const [manualTimeDate, setManualTimeDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    completionRate: 0
  });

  // Team state
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("member");
  
  // Reminder state
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");

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
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [taskTeamId, setTaskTeamId] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "board">("list");

  useEffect(() => {
    if (user) {
      checkSubscriptionStatus();
      fetchTasks();
      fetchTeams();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamMembers(selectedTeam);
      fetchTasks();
    }
  }, [selectedTeam]);

  // Timer effect - increment every second when timer is active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer) {
      interval = setInterval(() => {
        const startTime = new Date(activeTimer.started_at).getTime();
        const now = Date.now();
        const seconds = Math.floor((now - startTime) / 1000);
        setTimerSeconds(seconds);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer]);

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
      let query = supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (selectedTeam) {
        query = query.eq("team_id", selectedTeam);
      } else {
        query = query.eq("user_id", user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTasks((data || []) as unknown as Task[]);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTeams(data || []);
    } catch (error: any) {
      console.error("Error fetching teams:", error);
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_id", teamId);

      if (error) throw error;
      
      // Fetch profile data separately
      if (data) {
        const membersWithProfiles = await Promise.all(
          data.map(async (member) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("id", member.user_id)
              .single();
            
            return { ...member, profiles: profile };
          })
        );
        setTeamMembers(membersWithProfiles as any);
      }
    } catch (error: any) {
      console.error("Error fetching team members:", error);
    }
  };

  const fetchReminders = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from("task_reminders")
        .select("*")
        .eq("task_id", taskId)
        .eq("user_id", user?.id)
        .order("remind_at", { ascending: true });

      if (error) throw error;
      setReminders(data || []);
    } catch (error: any) {
      console.error("Error fetching reminders:", error);
    }
  };

  const fetchTaskDetails = async (taskId: string) => {
    try {
      const [commentsRes, activitiesRes] = await Promise.all([
        supabase
          .from("task_comments")
          .select("*, profiles(username, avatar_url)")
          .eq("task_id", taskId)
          .order("created_at", { ascending: true }),
        supabase
          .from("task_activity")
          .select("*, profiles(username)")
          .eq("task_id", taskId)
          .order("created_at", { ascending: false })
      ]);

      if (commentsRes.data) setComments(commentsRes.data as any);
      if (activitiesRes.data) setActivities(activitiesRes.data as any);
      
      fetchReminders(taskId);
      fetchTimeLogs(taskId);
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
        team_id: taskTeamId,
        assigned_to: assignedTo,
      });

      if (error) throw error;

      toast.success("Task created successfully!");
      showNotification("Task Created", `New task: ${title}`, "default");
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
          team_id: taskTeamId,
          assigned_to: assignedTo,
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
    setAssignedTo(null);
    setTaskTeamId(selectedTeam);
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
    setAssignedTo(task.assigned_to);
    setTaskTeamId(task.team_id);
    setDialogOpen(true);
  };

  const handleCreateTeam = async () => {
    if (!user || !teamName) {
      toast.error("Please enter a team name");
      return;
    }

    try {
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: teamName,
          description: teamDescription,
          created_by: user.id,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: team.id,
          user_id: user.id,
          role: "owner",
        });

      if (memberError) throw memberError;

      toast.success("Team created successfully!");
      setTeamDialogOpen(false);
      setTeamName("");
      setTeamDescription("");
      fetchTeams();
      setSelectedTeam(team.id);
    } catch (error: any) {
      console.error("Error creating team:", error);
      toast.error("Failed to create team");
    }
  };

  const handleAddTeamMember = async () => {
    if (!selectedTeam || !memberEmail) {
      toast.error("Please enter a user email");
      return;
    }

    try {
      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", memberEmail)
        .single();

      if (profileError || !profile) {
        toast.error("User not found");
        return;
      }

      const { error } = await supabase
        .from("team_members")
        .insert({
          team_id: selectedTeam,
          user_id: profile.id,
          role: memberRole,
        });

      if (error) throw error;

      toast.success("Team member added!");
      setMemberEmail("");
      setMemberRole("member");
      fetchTeamMembers(selectedTeam);
    } catch (error: any) {
      console.error("Error adding team member:", error);
      toast.error("Failed to add team member");
    }
  };

  const handleRemoveTeamMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast.success("Member removed from team");
      if (selectedTeam) fetchTeamMembers(selectedTeam);
    } catch (error: any) {
      console.error("Error removing team member:", error);
      toast.error("Failed to remove member");
    }
  };

  const handleAddReminder = async () => {
    if (!selectedTask || !reminderDate || !reminderTime) {
      toast.error("Please select both date and time for reminder");
      return;
    }

    try {
      const remindAt = new Date(`${reminderDate}T${reminderTime}`);
      
      const { error } = await supabase
        .from("task_reminders")
        .insert({
          task_id: selectedTask.id,
          user_id: user!.id,
          remind_at: remindAt.toISOString(),
        });

      if (error) throw error;

      toast.success("Reminder set!");
      setReminderDialogOpen(false);
      setReminderDate("");
      setReminderTime("");
      if (selectedTask) fetchReminders(selectedTask.id);
    } catch (error: any) {
      console.error("Error adding reminder:", error);
      toast.error("Failed to set reminder");
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from("task_reminders")
        .delete()
        .eq("id", reminderId);

      if (error) throw error;

      toast.success("Reminder deleted");
      if (selectedTask) fetchReminders(selectedTask.id);
    } catch (error: any) {
      console.error("Error deleting reminder:", error);
      toast.error("Failed to delete reminder");
    }
  };

  // Time tracking functions
  const fetchTimeLogs = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from("time_logs")
        .select("*, profiles(username, avatar_url)")
        .eq("task_id", taskId)
        .order("started_at", { ascending: false });

      if (error) throw error;
      setTimeLogs((data || []) as any);

      // Check for active timer
      const active = data?.find(log => !log.ended_at);
      if (active) {
        setActiveTimer(active as any);
        const startTime = new Date(active.started_at).getTime();
        const now = Date.now();
        setTimerSeconds(Math.floor((now - startTime) / 1000));
      }
    } catch (error: any) {
      console.error("Error fetching time logs:", error);
    }
  };

  const handleStartTimer = async (taskId: string) => {
    if (!user) return;

    try {
      // Stop any existing timers for this user
      const { data: existingTimers } = await supabase
        .from("time_logs")
        .select("*")
        .eq("user_id", user.id)
        .is("ended_at", null);

      if (existingTimers && existingTimers.length > 0) {
        for (const timer of existingTimers) {
          await handleStopTimer(timer.id);
        }
      }

      // Start new timer
      const { data, error } = await supabase
        .from("time_logs")
        .insert({
          task_id: taskId,
          user_id: user.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setActiveTimer(data as any);
      setTimerSeconds(0);
      toast.success("Timer started!");
      fetchTimeLogs(taskId);
    } catch (error: any) {
      console.error("Error starting timer:", error);
      toast.error("Failed to start timer");
    }
  };

  const handleStopTimer = async (timeLogId: string) => {
    try {
      const endTime = new Date();
      const log = timeLogs.find(l => l.id === timeLogId) || activeTimer;
      
      if (!log) return;

      const startTime = new Date(log.started_at);
      const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      const { error } = await supabase
        .from("time_logs")
        .update({
          ended_at: endTime.toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq("id", timeLogId);

      if (error) throw error;

      if (activeTimer?.id === timeLogId) {
        setActiveTimer(null);
        setTimerSeconds(0);
      }

      toast.success(`Time logged: ${formatDuration(durationSeconds)}`);
      if (selectedTask) {
        fetchTimeLogs(selectedTask.id);
        fetchTasks();
      }
    } catch (error: any) {
      console.error("Error stopping timer:", error);
      toast.error("Failed to stop timer");
    }
  };

  const handleAddManualTime = async () => {
    if (!selectedTask || !manualTimeHours) {
      toast.error("Please enter time duration");
      return;
    }

    try {
      const hours = parseFloat(manualTimeHours);
      const durationSeconds = Math.floor(hours * 3600);
      const startTime = new Date(`${manualTimeDate}T09:00:00`);
      const endTime = new Date(startTime.getTime() + durationSeconds * 1000);

      const { error } = await supabase
        .from("time_logs")
        .insert({
          task_id: selectedTask.id,
          user_id: user!.id,
          started_at: startTime.toISOString(),
          ended_at: endTime.toISOString(),
          duration_seconds: durationSeconds,
          description: manualTimeDescription || null,
        });

      if (error) throw error;

      toast.success("Time logged!");
      setManualTimeHours("");
      setManualTimeDescription("");
      setManualTimeDate(format(new Date(), "yyyy-MM-dd"));
      fetchTimeLogs(selectedTask.id);
      fetchTasks();
    } catch (error: any) {
      console.error("Error adding manual time:", error);
      toast.error("Failed to log time");
    }
  };

  const handleDeleteTimeLog = async (timeLogId: string) => {
    try {
      const { error } = await supabase
        .from("time_logs")
        .delete()
        .eq("id", timeLogId);

      if (error) throw error;

      toast.success("Time log deleted");
      if (selectedTask) {
        fetchTimeLogs(selectedTask.id);
        fetchTasks();
      }
    } catch (error: any) {
      console.error("Error deleting time log:", error);
      toast.error("Failed to delete time log");
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Realtime subscriptions for collaborative updates
  useRealtimeSubscription({
    channel: `tasks-${user?.id}`,
    table: "tasks",
    event: "*",
    onUpdate: () => {
      fetchTasks();
      showNotification("Task Updated", "A task has been updated by a team member", "default");
    },
  });

  useRealtimeSubscription({
    channel: `task-comments-${selectedTask?.id}`,
    table: "task_comments",
    filter: `task_id=eq.${selectedTask?.id}`,
    event: "*",
    onUpdate: () => {
      if (selectedTask) fetchTaskDetails(selectedTask.id);
    },
  });

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
        <div className="flex items-center justify-center min-h-[80vh] px-4 pt-20">
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
      <div className="container mx-auto px-4 pt-20 pb-6 max-w-7xl">
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

        {/* Team Selector */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <Label>Team Workspace:</Label>
              </div>
              <Select value={selectedTeam || "personal"} onValueChange={(val) => setSelectedTeam(val === "personal" ? null : val)}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal Tasks</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setTeamDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Team
              </Button>
              {selectedTeam && (
                <>
                  <Button variant="outline" onClick={() => setManageMembersOpen(true)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Members
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/team-dashboard")}>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Team Dashboard
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => navigate("/team-management")}>
                <Users className="w-4 h-4 mr-2" />
                Team Management
              </Button>
            </div>
          </CardContent>
        </Card>

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

            {/* Team Assignment */}
            {selectedTeam && teamMembers.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="assign_to">Assign To (Team Member)</Label>
                <Select value={assignedTo || "unassigned"} onValueChange={(val) => setAssignedTo(val === "unassigned" ? null : val)}>
                  <SelectTrigger id="assign_to">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.user_id}>
                        {member.profiles?.username || "Unknown"} ({member.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Timer className="w-4 h-4" />
                        Time Tracking
                      </h4>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTimeTrackingDialogOpen(true)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Log Time
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTimeReportsDialogOpen(true)}
                        >
                          <BarChart3 className="w-3 h-3 mr-1" />
                          Reports
                        </Button>
                      </div>
                    </div>

                    {/* Timer Controls */}
                    <div className="p-4 rounded-lg border bg-card mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold font-mono">
                            {formatDuration(timerSeconds)}
                          </div>
                          {activeTimer && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Started {format(new Date(activeTimer.started_at), "HH:mm")}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {activeTimer ? (
                            <Button
                              variant="destructive"
                              size="lg"
                              onClick={() => handleStopTimer(activeTimer.id)}
                            >
                              <PauseCircle className="w-5 h-5 mr-2" />
                              Stop
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              size="lg"
                              onClick={() => handleStartTimer(selectedTask.id)}
                            >
                              <PlayCircle className="w-5 h-5 mr-2" />
                              Start
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Time Summary */}
                    {selectedTask.time_tracking && (
                      <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Estimated</p>
                          <p className="text-lg font-semibold">
                            {selectedTask.time_tracking.estimated.toFixed(1)}h
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Spent</p>
                          <p className="text-lg font-semibold">
                            {selectedTask.time_tracking.spent.toFixed(1)}h
                          </p>
                        </div>
                        {selectedTask.time_tracking.estimated > 0 && (
                          <div className="col-span-2">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-muted-foreground">Progress</p>
                              <p className="text-xs font-medium">
                                {((selectedTask.time_tracking.spent / selectedTask.time_tracking.estimated) * 100).toFixed(0)}%
                              </p>
                            </div>
                            <Progress 
                              value={(selectedTask.time_tracking.spent / selectedTask.time_tracking.estimated) * 100} 
                              className="h-2"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Time Logs */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-semibold text-muted-foreground mb-2">Recent Logs</h5>
                      {timeLogs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No time logged yet</p>
                      ) : (
                        timeLogs.slice(0, 5).map(log => (
                          <div key={log.id} className="flex items-center justify-between p-2 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Timer className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {log.duration_seconds ? formatDuration(log.duration_seconds) : "In progress..."}
                                  </span>
                                  {log.profiles?.username && (
                                    <span className="text-xs text-muted-foreground">
                                      by {log.profiles.username}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(log.started_at), "MMM dd, yyyy 'at' HH:mm")}
                                </p>
                                {log.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{log.description}</p>
                                )}
                              </div>
                            </div>
                            {log.ended_at && log.user_id === user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTimeLog(log.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

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

                  {/* Reminders */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Reminders
                      </h4>
                      <Button variant="outline" size="sm" onClick={() => setReminderDialogOpen(true)}>
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {reminders.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No reminders set</p>
                      ) : (
                        reminders.map(reminder => (
                          <div key={reminder.id} className="flex items-center justify-between p-2 rounded-lg border">
                            <div className="flex items-center gap-2">
                              <Bell className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">
                                {format(new Date(reminder.remind_at), "MMM dd, yyyy 'at' HH:mm")}
                              </span>
                              {reminder.sent && (
                                <Badge variant="outline" className="text-xs">Sent</Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteReminder(reminder.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
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

      {/* Create Team Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Create a team workspace to collaborate with others
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team_name">Team Name *</Label>
              <Input
                id="team_name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team_description">Description</Label>
              <Textarea
                id="team_description"
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                placeholder="Team description (optional)"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTeam}>Create Team</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={manageMembersOpen} onOpenChange={setManageMembersOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Team Members</DialogTitle>
            <DialogDescription>
              Add or remove members from your team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Add Member Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Add Member</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter username"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="flex-1"
                />
                <Select value={memberRole} onValueChange={setMemberRole}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleAddTeamMember}>
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Current Members */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Current Members ({teamMembers.length})</h4>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {member.profiles?.username?.[0]?.toUpperCase() || "U"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {member.profiles?.username || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            {member.role}
                          </p>
                        </div>
                      </div>
                      {member.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTeamMember(member.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Reminder Dialog */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Reminder</DialogTitle>
            <DialogDescription>
              Get notified about this task at a specific time
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reminder_date">Date *</Label>
              <Input
                id="reminder_date"
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder_time">Time *</Label>
              <Input
                id="reminder_time"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReminderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddReminder}>
              <Bell className="w-4 h-4 mr-2" />
              Set Reminder
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Time Entry Dialog */}
      <Dialog open={timeTrackingDialogOpen} onOpenChange={setTimeTrackingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Time Manually</DialogTitle>
            <DialogDescription>
              Add time spent on this task manually
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="manual_time_date">Date *</Label>
              <Input
                id="manual_time_date"
                type="date"
                value={manualTimeDate}
                onChange={(e) => setManualTimeDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual_time_hours">Hours *</Label>
              <Input
                id="manual_time_hours"
                type="number"
                step="0.25"
                min="0"
                placeholder="e.g., 2.5"
                value={manualTimeHours}
                onChange={(e) => setManualTimeHours(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual_time_description">Description (Optional)</Label>
              <Textarea
                id="manual_time_description"
                placeholder="What did you work on?"
                value={manualTimeDescription}
                onChange={(e) => setManualTimeDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTimeTrackingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddManualTime}>
              <Timer className="w-4 h-4 mr-2" />
              Log Time
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Time Reports Dialog */}
      <Dialog open={timeReportsDialogOpen} onOpenChange={setTimeReportsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Time Tracking Reports</DialogTitle>
            <DialogDescription>
              Visual reports of time spent across tasks and team members
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[70vh] pr-4">
            <div className="space-y-6 py-4">
              {/* Time Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Logged</CardDescription>
                    <CardTitle className="text-2xl">
                      {(tasks.reduce((sum, task) => sum + (task.time_tracking?.spent || 0), 0)).toFixed(1)}h
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Estimated</CardDescription>
                    <CardTitle className="text-2xl">
                      {(tasks.reduce((sum, task) => sum + (task.time_tracking?.estimated || 0), 0)).toFixed(1)}h
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Efficiency</CardDescription>
                    <CardTitle className="text-2xl">
                      {(() => {
                        const totalEstimated = tasks.reduce((sum, task) => sum + (task.time_tracking?.estimated || 0), 0);
                        const totalSpent = tasks.reduce((sum, task) => sum + (task.time_tracking?.spent || 0), 0);
                        if (totalEstimated === 0) return "N/A";
                        return `${((totalEstimated / totalSpent) * 100).toFixed(0)}%`;
                      })()}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Time by Task Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Time by Task
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const taskTimeData = tasks
                      .filter(task => task.time_tracking && (task.time_tracking.spent > 0 || task.time_tracking.estimated > 0))
                      .map(task => ({
                        name: task.title.substring(0, 20) + (task.title.length > 20 ? '...' : ''),
                        estimated: task.time_tracking?.estimated || 0,
                        spent: task.time_tracking?.spent || 0
                      }))
                      .slice(0, 10);

                    return (
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsBarChart data={taskTimeData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                          <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="estimated" fill="hsl(var(--primary))" name="Estimated" />
                          <Bar dataKey="spent" fill="hsl(var(--accent))" name="Spent" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Time by Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Time by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const categoryTime = tasks.reduce((acc, task) => {
                      const category = task.category || 'General';
                      const spent = task.time_tracking?.spent || 0;
                      acc[category] = (acc[category] || 0) + spent;
                      return acc;
                    }, {} as Record<string, number>);

                    const pieData = Object.entries(categoryTime)
                      .filter(([_, value]) => value > 0)
                      .map(([name, value]) => ({ name, value }));

                    const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658', '#ff8042'];

                    return pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry.name}: ${entry.value.toFixed(1)}h`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        No time logged yet
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Task List with Time Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Time Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tasks
                      .filter(task => task.time_tracking && task.time_tracking.spent > 0)
                      .sort((a, b) => (b.time_tracking?.spent || 0) - (a.time_tracking?.spent || 0))
                      .map(task => (
                        <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{task.title}</p>
                            <p className="text-xs text-muted-foreground">{task.category}</p>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="text-right">
                              <p className="font-medium">{task.time_tracking?.spent.toFixed(1)}h</p>
                              <p className="text-xs text-muted-foreground">spent</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{task.time_tracking?.estimated.toFixed(1)}h</p>
                              <p className="text-xs text-muted-foreground">estimated</p>
                            </div>
                            {task.time_tracking && task.time_tracking.estimated > 0 && (
                              <div className="w-20">
                                <Progress 
                                  value={(task.time_tracking.spent / task.time_tracking.estimated) * 100} 
                                  className="h-2"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
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