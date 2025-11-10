import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { useManagerRole } from "@/hooks/useManagerRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, Plus, Check, X, Clock } from "lucide-react";
import { format } from "date-fns";

interface TimeOffRequest {
  id: string;
  type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  created_at: string;
  profiles?: {
    username: string;
    full_name: string;
  };
}

export default function TimeOff() {
  const { user } = useAuth();
  const { isManager } = useManagerRole();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRequest, setNewRequest] = useState({
    type: "vacation",
    start_date: "",
    end_date: "",
    reason: "",
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchRequests();
  }, [user, navigate]);

  const fetchRequests = async () => {
    let query = supabase
      .from("time_off_requests")
      .select("*");

    if (!isManager) {
      query = query.eq("user_id", user?.id);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch requests:", error);
      return;
    }

    // Fetch usernames for each request
    const requestsWithProfiles = await Promise.all(
      (data || []).map(async (req) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, full_name")
          .eq("id", req.user_id)
          .single();
        
        return {
          ...req,
          profiles: profile || { username: "Unknown", full_name: "Unknown" }
        };
      })
    );

    setRequests(requestsWithProfiles);
  };

  const handleCreateRequest = async () => {
    if (!newRequest.start_date || !newRequest.end_date || !user) {
      toast.error("Please fill in all required fields");
      return;
    }

    const { error } = await supabase.from("time_off_requests").insert({
      user_id: user.id,
      type: newRequest.type,
      start_date: newRequest.start_date,
      end_date: newRequest.end_date,
      reason: newRequest.reason.trim() || null,
    });

    if (error) {
      toast.error("Failed to create request");
      return;
    }

    toast.success("Time off request submitted");
    setDialogOpen(false);
    setNewRequest({ type: "vacation", start_date: "", end_date: "", reason: "" });
    fetchRequests();
  };

  const handleUpdateStatus = async (requestId: string, status: string) => {
    const { error } = await supabase
      .from("time_off_requests")
      .update({
        status,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      toast.error("Failed to update request");
      return;
    }

    toast.success(`Request ${status}`);
    fetchRequests();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    }
  };

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <div className="container mx-auto pt-20 pb-20 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Time Off Requests</h1>
            <p className="text-muted-foreground">Manage vacation and leave requests</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Time Off</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Type *</Label>
                  <Select
                    value={newRequest.type}
                    onValueChange={(value) => setNewRequest({ ...newRequest, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">Vacation</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={newRequest.start_date}
                      onChange={(e) => setNewRequest({ ...newRequest, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>End Date *</Label>
                    <Input
                      type="date"
                      value={newRequest.end_date}
                      onChange={(e) => setNewRequest({ ...newRequest, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Reason</Label>
                  <Textarea
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                    placeholder="Provide additional details..."
                  />
                </div>
                <Button onClick={handleCreateRequest} className="w-full">
                  Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {requests.filter((r) => r.status === "approved").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {requests.filter((r) => r.status === "rejected").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{requests.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        <Card>
          <CardHeader>
            <CardTitle>All Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No time off requests yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <Card key={request.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline">{getTypeLabel(request.type)}</Badge>
                            <Badge className={getStatusColor(request.status)}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                          </div>
                          {isManager && (
                            <h4 className="font-semibold mb-1">{request.profiles?.full_name}</h4>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(request.start_date), "MMM d, yyyy")} -{" "}
                              {format(new Date(request.end_date), "MMM d, yyyy")}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {format(new Date(request.created_at), "MMM d, yyyy")}
                            </div>
                          </div>
                          {request.reason && (
                            <p className="mt-2 text-sm text-muted-foreground">{request.reason}</p>
                          )}
                        </div>
                        {isManager && request.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleUpdateStatus(request.id, "approved")}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleUpdateStatus(request.id, "rejected")}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
