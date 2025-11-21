import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const ScanAccess = () => {
  const { workspaceId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [status, setStatus] = useState<"form" | "requesting" | "success" | "error">("form");

  // Fetch workspace info and check existing access
  useEffect(() => {
    const checkAccess = async () => {
      if (!workspaceId) {
        toast.error("Invalid workspace link");
        setLoading(false);
        return;
      }

      // Redirect to auth if not logged in
      if (!user) {
        toast.info("Please log in to request access");
        navigate(`/auth?redirect=/scan-access/${workspaceId}`);
        return;
      }

      try {
        // Fetch workspace info
        const { data: workspace, error: workspaceError } = await supabase
          .from("workspaces")
          .select("name, owner_id")
          .eq("id", workspaceId)
          .maybeSingle();

        if (workspaceError) {
          console.error("Error fetching workspace:", workspaceError);
          toast.error("Error loading workspace");
          setLoading(false);
          return;
        }

        if (!workspace) {
          toast.error("Workspace not found");
          setLoading(false);
          return;
        }

        setWorkspaceName(workspace.name);

        // Check if user is workspace owner
        if (workspace.owner_id === user.id) {
          toast.success("Welcome to your workspace!");
          navigate("/inventory-manager");
          return;
        }

        // Check if user is already a member
        const { data: membership } = await supabase
          .from("workspace_members")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (membership) {
          toast.success("Access granted!");
          navigate("/inventory-manager");
          return;
        }

        // Check for any existing request
        const { data: existing } = await supabase
          .from("access_requests")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) {
          if (existing.status === "pending") {
            setStatus("success");
            toast.info("Your access request is pending approval");
          } else if (existing.status === "rejected") {
            // Allow them to submit a new request
            setStatus("form");
          }
          // If approved but not in workspace_members, they still need to request
        }
      } catch (error) {
        console.error("Error checking access:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, workspaceId, navigate]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workspaceId || !user) {
      toast.error("Please log in first");
      navigate(`/auth?redirect=/scan-access/${workspaceId}`);
      return;
    }

    setSubmitting(true);
    setStatus("requesting");

    try {
      // Check if user is already a workspace member first
      const { data: membership } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (membership) {
        toast.success("You already have access to this workspace!");
        navigate("/inventory-manager");
        return;
      }

      // Check for existing requests
      const { data: existingRequests } = await supabase
        .from("access_requests")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const pendingRequest = existingRequests?.find(r => r.status === "pending");
      
      if (pendingRequest) {
        toast.info("You already have a pending access request");
        setStatus("success");
        return;
      }

      // Delete any old rejected/approved requests to avoid duplicate key errors
      if (existingRequests && existingRequests.length > 0) {
        const oldRequestIds = existingRequests.map(r => r.id);
        await supabase
          .from("access_requests")
          .delete()
          .in("id", oldRequestIds);
      }

      // Create new access request
      const { error: requestError } = await supabase
        .from("access_requests")
        .insert([{
          workspace_id: workspaceId,
          user_id: user.id,
          user_email: user.email,
          status: "pending",
          qr_code_id: workspaceId
        }]);

      if (requestError) {
        console.error("Access request error:", requestError);
        throw new Error(requestError.message || "Failed to create access request");
      }

      setStatus("success");
      toast.success("Access request sent! You'll be notified when approved.");
    } catch (error: any) {
      console.error("Error requesting access:", error);
      setStatus("error");
      toast.error(error.message || "Failed to request access. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "form" ? (
            <>
              <CardTitle>Join {workspaceName}</CardTitle>
              <CardDescription>
                Request access to this workspace
              </CardDescription>
            </>
          ) : status === "requesting" ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <CardTitle>Sending Request</CardTitle>
              <CardDescription>Please wait...</CardDescription>
            </>
          ) : status === "success" ? (
            <>
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <CardTitle>Request Sent!</CardTitle>
              <CardDescription>
                Your access request is pending approval. You'll be notified via email.
              </CardDescription>
            </>
          ) : (
            <>
              <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <CardTitle>Request Failed</CardTitle>
              <CardDescription>
                Unable to process your access request. Please try again.
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        {status === "form" && user && (
          <CardContent>
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Your Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Logged in as {user.email}
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Submitting..." : "Request Access"}
              </Button>
            </form>
          </CardContent>
        )}

        {status === "error" && (
          <CardContent>
            <Button onClick={() => setStatus("form")} className="w-full">
              Try Again
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ScanAccess;
