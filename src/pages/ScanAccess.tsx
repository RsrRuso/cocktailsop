import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useManagerRole } from "@/hooks/useManagerRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const ScanAccess = () => {
  const { qrCodeId } = useParams();
  const { user } = useAuth();
  const { isManager, isLoading: isLoadingRole } = useManagerRole();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"form" | "checking" | "requesting" | "success" | "error">("form");

  // Check for existing access if user is logged in
  useEffect(() => {
    const checkExistingAccess = async () => {
      if (!user || !qrCodeId) return;
      
      setLoading(true);
      try {
        // If user is a manager/founder, automatically approve their access
        if (isManager && !isLoadingRole) {
          const { data: existing } = await supabase
            .from("access_requests")
            .select("*")
            .eq("qr_code_id", qrCodeId)
            .eq("user_id", user.id)
            .single();

          if (!existing || existing.status !== "approved") {
            // Create or update to approved status
            await supabase
              .from("access_requests")
              .upsert({
                qr_code_id: qrCodeId,
                user_id: user.id,
                user_email: user.email,
                status: "approved",
                approved_by: user.id,
                approved_at: new Date().toISOString()
              }, {
                onConflict: 'id'
              });
          }

          toast.success("Access automatically granted!");
          setTimeout(() => navigate("/inventory-manager"), 1500);
          return;
        }

        const { data: existing } = await supabase
          .from("access_requests")
          .select("*")
          .eq("qr_code_id", qrCodeId)
          .eq("user_id", user.id)
          .single();

        if (existing) {
          if (existing.status === "approved") {
            toast.success("Access already granted!");
            setTimeout(() => navigate("/inventory-manager"), 1500);
            return;
          }
          if (existing.status === "pending") {
            setStatus("success");
            toast.info("Your request is pending approval");
          }
        }
      } catch (error) {
        // No existing request found, show form
      } finally {
        setLoading(false);
      }
    };

    if (!isLoadingRole) {
      checkExistingAccess();
    }
  }, [user, qrCodeId, navigate, isManager, isLoadingRole]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!qrCodeId) {
      toast.error("Invalid QR code");
      return;
    }

    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setSubmitting(true);
    setStatus("requesting");

    try {
      // Check if email already has a pending/approved request for this QR code
      const { data: existing } = await supabase
        .from("access_requests")
        .select("*")
        .eq("qr_code_id", qrCodeId)
        .eq("user_email", email)
        .single();

      if (existing) {
        if (existing.status === "approved") {
          toast.info("This email already has approved access");
          setStatus("success");
          return;
        }
        if (existing.status === "pending") {
          toast.info("A request from this email is already pending");
          setStatus("success");
          return;
        }
      }

      // Create new access request
      const { error } = await supabase
        .from("access_requests")
        .insert({
          qr_code_id: qrCodeId,
          user_id: user?.id || null,
          user_email: email,
          status: "pending"
        });

      if (error) throw error;

      setStatus("success");
      toast.success("Access request sent! You'll be notified once approved.");
    } catch (error: any) {
      console.error("Error requesting access:", error);
      setStatus("error");
      toast.error(error.message || "Failed to request access");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || isLoadingRole) {
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
              <CardTitle>Request Inventory Access</CardTitle>
              <CardDescription>
                Enter your email to request access to the inventory management system
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
                Your access request has been sent to the manager. You'll be notified once approved.
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
