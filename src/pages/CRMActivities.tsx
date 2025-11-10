import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Plus, Phone, Mail, Calendar, CheckCircle2, Clock, Activity as ActivityIcon, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

const ACTIVITY_TYPES = ["call", "email", "meeting", "task"];
const ACTIVITY_STATUSES = ["planned", "in_progress", "completed", "cancelled"];
const PRIORITY_LEVELS = ["low", "medium", "high", "urgent"];

export default function CRMActivities() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any>(null);

  // Form state
  const [type, setType] = useState("call");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("planned");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [contactId, setContactId] = useState("");

  useEffect(() => {
    if (user) {
      fetchActivities();
      fetchContacts();
    }
  }, [user]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("crm_contacts")
        .select("id, first_name, last_name")
        .eq("user_id", user!.id);

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
    }
  };

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("crm_activities")
        .select("*, crm_contacts(first_name, last_name)")
        .eq("user_id", user!.id)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error: any) {
      toast.error("Failed to load activities");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!type || !subject) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      const activityData = {
        user_id: user!.id,
        type,
        subject,
        description,
        status,
        priority,
        due_date: dueDate || null,
        contact_id: contactId || null
      };

      if (editingActivity) {
        const { error } = await supabase
          .from("crm_activities")
          .update(activityData)
          .eq("id", editingActivity.id);
        if (error) throw error;
        toast.success("Activity updated!");
      } else {
        const { error } = await supabase.from("crm_activities").insert(activityData);
        if (error) throw error;
        toast.success("Activity created!");
      }

      setDialogOpen(false);
      resetForm();
      fetchActivities();
    } catch (error: any) {
      toast.error("Failed to save activity");
    }
  };

  const handleStatusChange = async (activityId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("crm_activities")
        .update(updateData)
        .eq("id", activityId);

      if (error) throw error;
      toast.success("Activity updated!");
      fetchActivities();
    } catch (error: any) {
      toast.error("Failed to update activity");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("crm_activities").delete().eq("id", id);
      if (error) throw error;
      toast.success("Activity deleted!");
      fetchActivities();
    } catch (error: any) {
      toast.error("Failed to delete activity");
    }
  };

  const openEditDialog = (activity: any) => {
    setEditingActivity(activity);
    setType(activity.type);
    setSubject(activity.subject);
    setDescription(activity.description || "");
    setStatus(activity.status);
    setPriority(activity.priority);
    setDueDate(activity.due_date ? format(new Date(activity.due_date), "yyyy-MM-dd'T'HH:mm") : "");
    setContactId(activity.contact_id || "");
    setDialogOpen(true);
  };

  const resetForm = () => {
    setType("call");
    setSubject("");
    setDescription("");
    setStatus("planned");
    setPriority("medium");
    setDueDate("");
    setContactId("");
    setEditingActivity(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "call": return <Phone className="w-4 h-4" />;
      case "email": return <Mail className="w-4 h-4" />;
      case "meeting": return <Calendar className="w-4 h-4" />;
      case "task": return <CheckCircle2 className="w-4 h-4" />;
      default: return <ActivityIcon className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: any = {
      urgent: "destructive",
      high: "default",
      medium: "secondary",
      low: "outline"
    };
    return colors[priority] || "secondary";
  };

  const filterActivitiesByStatus = (filterStatus: string) => {
    return activities.filter(a => a.status === filterStatus);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopNav />
      <div className="container mx-auto px-4 pt-20 pb-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/crm")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <ActivityIcon className="w-8 h-8 text-primary" />
                Activities
              </h1>
              <p className="text-sm text-muted-foreground">Track calls, meetings, and tasks</p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Activity
          </Button>
        </div>

        {/* Activities Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="all">All ({activities.length})</TabsTrigger>
            <TabsTrigger value="planned">Planned ({filterActivitiesByStatus("planned").length})</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress ({filterActivitiesByStatus("in_progress").length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({filterActivitiesByStatus("completed").length})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled ({filterActivitiesByStatus("cancelled").length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <ActivityList
              activities={activities}
              loading={loading}
              onStatusChange={handleStatusChange}
              onEdit={openEditDialog}
              onDelete={handleDelete}
              getTypeIcon={getTypeIcon}
              getPriorityColor={getPriorityColor}
            />
          </TabsContent>

          {ACTIVITY_STATUSES.map(statusType => (
            <TabsContent key={statusType} value={statusType}>
              <ActivityList
                activities={filterActivitiesByStatus(statusType)}
                loading={loading}
                onStatusChange={handleStatusChange}
                onEdit={openEditDialog}
                onDelete={handleDelete}
                getTypeIcon={getTypeIcon}
                getPriorityColor={getPriorityColor}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingActivity ? "Edit Activity" : "Create New Activity"}</DialogTitle>
            <DialogDescription>
              {editingActivity ? "Update activity details" : "Schedule a new activity"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="E.g., Follow-up call with John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_LEVELS.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="contact">Related Contact</Label>
                <Select value={contactId} onValueChange={setContactId}>
                  <SelectTrigger id="contact">
                    <SelectValue placeholder="Select contact (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Activity details..."
                  rows={3}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingActivity ? "Update Activity" : "Create Activity"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}

function ActivityList({ activities, loading, onStatusChange, onEdit, onDelete, getTypeIcon, getPriorityColor }: any) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">No activities found</p>
          <p className="text-sm text-muted-foreground">Create your first activity to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {activities.map((activity: any) => (
        <Card key={activity.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {getTypeIcon(activity.type)}
                  </div>
                  <Badge variant={getPriorityColor(activity.priority)} className="text-xs">
                    {activity.priority}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{activity.subject}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.crm_contacts && (
              <p className="text-sm text-muted-foreground">
                {activity.crm_contacts.first_name} {activity.crm_contacts.last_name}
              </p>
            )}

            {activity.due_date && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(activity.due_date), "MMM dd, yyyy HH:mm")}</span>
              </div>
            )}

            {activity.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{activity.description}</p>
            )}

            <div className="space-y-2">
              <Select 
                value={activity.status} 
                onValueChange={(value) => onStatusChange(activity.id, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(activity)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => onDelete(activity.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}