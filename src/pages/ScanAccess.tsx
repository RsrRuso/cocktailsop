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
          toast.info("This email already has approved access. Please sign in at cocktailsop.com/auth");
          setStatus("success");
          return;
        }
        if (existing.status === "pending") {
          toast.info("A request from this email is already pending approval");
          setStatus("success");
          return;
        }
      }

      // Check if user already exists by trying to find them in access_requests or trying signup
      let userId: string | null = null;
      
      // Generate a random password for new users
      const tempPassword = crypto.randomUUID() + "!Aa1";

      // Try to create user account (this will fail silently if user exists)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: tempPassword,
        options: {
          emailRedirectTo: 'https://cocktailsop.com/auth',
          data: {
            full_name: email.split('@')[0],
            username: email.split('@')[0] + Math.random().toString(36).substring(7),
          }
        }
      });

      // If signup succeeded, use the new user's ID
      if (signUpData?.user?.id) {
        userId = signUpData.user.id;
        
        // Send password reset email so they can set their own password
        try {
          await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'https://cocktailsop.com/auth',
          });
        } catch (resetError) {
          console.log("Password reset email could not be sent:", resetError);
        }
      } else if (signUpError) {
        console.log("Signup info:", signUpError.message);
      }

      // Create access request (even if signup failed, we create the request with null user_id)
      const { error: requestError } = await supabase
        .from("access_requests")
        .insert([{
          workspace_id: workspaceId,
          user_id: userId,
          user_email: email,
          status: "pending",
          qr_code_id: workspaceId
        }]);

      if (requestError) {
        console.error("Access request error:", requestError);
        throw new Error(requestError.message || "Failed to create access request");
      }

      setStatus("success");
      
      if (userId) {
        toast.success("Request sent! Check your email to set your password and wait for approval.");
      } else {
        toast.success("Request sent! You'll be notified when approved.");
      }
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
              <CardTitle>Account Created & Request Sent!</CardTitle>
              <CardDescription>
                Your account has been created. Check your email to set your password. Your workspace access request is pending approval.
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
