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
  const [email, setEmail] = useState("");
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

      try {
        // Fetch workspace info
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("name, owner_id")
          .eq("id", workspaceId)
          .single();

        if (!workspace) {
          toast.error("Workspace not found");
          setLoading(false);
          return;
        }

        setWorkspaceName(workspace.name);

        // If user is logged in
        if (user) {
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

          // Check for pending request
          const { data: existing } = await supabase
            .from("access_requests")
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("user_id", user.id)
            .eq("status", "pending")
            .maybeSingle();

          if (existing) {
            setStatus("success");
            toast.info("Your access request is pending approval");
          }
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
    
    if (!workspaceId) {
      toast.error("Invalid workspace link");
      return;
    }

    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setSubmitting(true);
    setStatus("requesting");

    try {
      // Check if email already has a pending/approved request for this workspace
      const { data: existing } = await supabase
        .from("access_requests")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("user_email", email)
        .maybeSingle();

      if (existing) {
        if (existing.status === "approved") {
          toast.info("This email already has approved access. Please sign up or log in.");
          setStatus("success");
          return;
        }
        if (existing.status === "pending") {
          toast.info("A request from this email is already pending approval");
          setStatus("success");
          return;
        }
      }

      // Create new access request
      const { error } = await supabase
        .from("access_requests")
        .insert([{
          workspace_id: workspaceId,
          user_id: user?.id || null,
          user_email: email,
          status: "pending",
          qr_code_id: workspaceId // Using workspace_id as qr_code_id for compatibility
        }]);

      if (error) throw error;

      setStatus("success");
      toast.success("Request sent! You'll receive an email when approved.");
    } catch (error: any) {
      console.error("Error requesting access:", error);
      setStatus("error");
      toast.error(error.message || "Failed to request access");
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
                Enter your email to request access to this workspace
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
                Your request has been sent to the workspace owner. You'll receive an email once approved.
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
        
        {status === "form" && (
          <CardContent>
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={submitting}
                />
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
