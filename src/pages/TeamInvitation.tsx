import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, UserPlus } from "lucide-react";

export default function TeamInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      setIsLoading(false);
      return;
    }

    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from("team_invitations")
        .select(`
          *,
          teams (
            name,
            description
          ),
          invited_by_profile:profiles!team_invitations_invited_by_fkey (
            full_name,
            username
          )
        `)
        .eq("token", token)
        .single();

      if (error) {
        console.error("Error fetching invitation:", error);
        setError("Invitation not found");
        return;
      }

      if (data.status !== "pending") {
        setError(`This invitation has been ${data.status}`);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError("This invitation has expired");
        return;
      }

      setInvitation(data);
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to load invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    setIsProcessing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Please log in to accept this invitation");
        navigate(`/auth?redirect=/team-invitation?token=${token}`);
        return;
      }

      // Check if email matches
      const userEmail = session.user.email?.toLowerCase();
      if (userEmail !== invitation.invited_email.toLowerCase()) {
        toast.error("This invitation was sent to a different email address");
        return;
      }

      // Update invitation status
      const { error: updateError } = await supabase
        .from("team_invitations")
        .update({
          status: "accepted",
          invited_user_id: session.user.id,
        })
        .eq("id", invitation.id);

      if (updateError) {
        console.error("Update error:", updateError);
        toast.error("Failed to accept invitation");
        return;
      }

      // Add user to team
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: invitation.team_id,
          user_id: session.user.id,
          role: invitation.role,
        });

      if (memberError) {
        console.error("Member error:", memberError);
        toast.error("Failed to join team");
        return;
      }

      toast.success(`Successfully joined ${invitation.teams.name}!`);
      navigate("/team-management");
    } catch (error: any) {
      console.error("Accept error:", error);
      toast.error(error.message || "Failed to accept invitation");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from("team_invitations")
        .update({ status: "declined" })
        .eq("id", invitation.id);

      if (error) {
        console.error("Decline error:", error);
        toast.error("Failed to decline invitation");
        return;
      }

      toast.success("Invitation declined");
      navigate("/");
    } catch (error: any) {
      console.error("Decline error:", error);
      toast.error(error.message || "Failed to decline invitation");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-center">Invalid Invitation</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/")}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  const inviterName = invitation.invited_by_profile?.full_name || 
                     invitation.invited_by_profile?.username || 
                     "A team member";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">Team Invitation</CardTitle>
          <CardDescription className="text-center">
            You've been invited to join a team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Team</p>
              <p className="text-lg font-semibold">{invitation.teams.name}</p>
            </div>
            {invitation.teams.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm">{invitation.teams.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Invited by</p>
              <p className="font-medium">{inviterName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-medium capitalize">{invitation.role}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDecline}
              disabled={isProcessing}
            >
              Decline
            </Button>
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Accept Invitation
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            By accepting, you'll be added to the team and can start collaborating immediately.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
