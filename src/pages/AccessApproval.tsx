import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useManagerRole } from "@/hooks/useManagerRole";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Clock, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AccessRequest {
  id: string;
  user_email: string;
  status: string;
  created_at: string;
  user_id: string;
  workspace_id: string;
  workspaces?: {
    name: string;
  };
}

const AccessApproval = () => {
  const { user } = useAuth();
  const { isManager, isLoading: roleLoading } = useManagerRole();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isWorkspaceOwner, setIsWorkspaceOwner] = useState(false);

  // Check if user is a workspace owner
  useEffect(() => {
    const checkWorkspaceOwnership = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      setIsWorkspaceOwner(!!data && data.length > 0);
    };

    checkWorkspaceOwnership();
  }, [user]);

  // Check access permissions
  useEffect(() => {
    if (!roleLoading && !isManager && !isWorkspaceOwner) {
      toast.error("Access denied - You need to be a manager or workspace owner");
      navigate("/home");
    }
  }, [isManager, isWorkspaceOwner, roleLoading, navigate]);

  useEffect(() => {
    if (isManager || isWorkspaceOwner) {
      fetchRequests();
      
      // Subscribe to new requests
      const channel = supabase
        .channel("access_requests_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "access_requests"
          },
          () => {
            fetchRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isManager, isWorkspaceOwner]);

  const fetchRequests = async () => {
    try {
      if (!user) return;

      let query = supabase
        .from("access_requests")
        .select("*, workspaces(name)");

      // If not a manager, only show requests for their workspaces
      if (!isManager) {
        // First get user's workspace IDs
        const { data: workspaceData } = await supabase
          .from('workspaces')
          .select('id')
          .eq('owner_id', user.id);

        const workspaceIds = workspaceData?.map(w => w.id) || [];
        
        if (workspaceIds.length > 0) {
          query = query.in('workspace_id', workspaceIds);
        } else {
          // No workspaces owned, return empty
          setRequests([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load access requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      // Get the request details
      const request = requests.find(r => r.id === requestId);
      if (!request) throw new Error("Request not found");

      // Update access request status
      const { error: updateError } = await supabase
        .from("access_requests")
        .update({
          status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // Add user to workspace_members if they have a user_id
      if (request.user_id && request.workspace_id) {
        const { error: memberError } = await supabase
          .from("workspace_members")
          .insert({
            workspace_id: request.workspace_id,
            user_id: request.user_id,
            role: "member"
          });

        if (memberError) {
          console.error("Error adding to workspace:", memberError);
          // Don't throw - approval still succeeded
        }
      }

      toast.success("Access granted!");
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from("access_requests")
        .update({
          status: "rejected",
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (error) throw error;
      toast.success("Request rejected");
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject request");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          <Check className="mr-1 h-3 w-3" />
          Approved
        </Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
          <X className="mr-1 h-3 w-3" />
          Rejected
        </Badge>;
      default:
        return null;
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />
      <main className="flex-1 container mx-auto px-4 py-4 pb-20 max-w-4xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-xl">Access Requests</CardTitle>
                <CardDescription>
                  Approve or reject staff access to inventory management
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            {requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No access requests yet
              </p>
            ) : (
              requests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-3"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="font-medium truncate">{request.user_email}</p>
                    {request.workspaces && (
                      <p className="text-sm text-muted-foreground">
                        Workspace: {request.workspaces.name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(request.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusBadge(request.status)}
                    {request.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request.id)}
                          disabled={processingId === request.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(request.id)}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
};

export default AccessApproval;
