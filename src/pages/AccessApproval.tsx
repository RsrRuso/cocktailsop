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
import { Check, X, Clock, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AccessRequest {
  id: string;
  user_email: string;
  status: string;
  created_at: string;
  user_id: string;
}

const AccessApproval = () => {
  const { user } = useAuth();
  const { isManager, isLoading: roleLoading } = useManagerRole();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !isManager) {
      toast.error("Access denied - Manager privileges required");
      navigate("/home");
    }
  }, [isManager, roleLoading, navigate]);

  useEffect(() => {
    if (isManager) {
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
  }, [isManager]);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("access_requests")
        .select("*")
        .order("created_at", { ascending: false });

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
      const { error } = await supabase
        .from("access_requests")
        .update({
          status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (error) throw error;
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
      <main className="flex-1 container mx-auto px-4 py-6 pb-24">
        <Card>
          <CardHeader>
            <CardTitle>Access Requests</CardTitle>
            <CardDescription>
              Approve or reject staff access to inventory management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {requests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No access requests yet
                </p>
              ) : (
                requests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{request.user_email}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(request.created_at).toLocaleString()}
                          </p>
                          {getStatusBadge(request.status)}
                        </div>
                        {request.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                              onClick={() => handleApprove(request.id)}
                              disabled={processingId === request.id}
                            >
                              {processingId === request.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                              onClick={() => handleReject(request.id)}
                              disabled={processingId === request.id}
                            >
                              {processingId === request.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
};

export default AccessApproval;
