import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const ScanAccess = () => {
  const { qrCodeId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"checking" | "requesting" | "success" | "error">("checking");

  useEffect(() => {
    const requestAccess = async () => {
      if (!user || !qrCodeId) {
        setStatus("error");
        setLoading(false);
        return;
      }

      try {
        // Check if already has an access request
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
            setLoading(false);
            return;
          }
        }

        // Create new access request
        setStatus("requesting");
        const { error } = await supabase
          .from("access_requests")
          .insert({
            qr_code_id: qrCodeId,
            user_id: user.id,
            user_email: user.email,
            status: "pending"
          });

        if (error) throw error;

        setStatus("success");
        toast.success("Access request sent! Waiting for approval...");
      } catch (error) {
        console.error("Error requesting access:", error);
        setStatus("error");
        toast.error("Failed to request access");
      } finally {
        setLoading(false);
      }
    };

    requestAccess();
  }, [user, qrCodeId, navigate]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to request access</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "checking" || status === "requesting" ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <CardTitle>Processing Request</CardTitle>
              <CardDescription>
                {status === "checking" ? "Verifying access code..." : "Sending access request..."}
              </CardDescription>
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
              <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <CardTitle>Request Failed</CardTitle>
              <CardDescription>
                Unable to process your access request. Please try again or contact support.
              </CardDescription>
            </>
          )}
        </CardHeader>
        {!loading && (
          <CardContent>
            <Button onClick={() => navigate("/home")} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ScanAccess;
