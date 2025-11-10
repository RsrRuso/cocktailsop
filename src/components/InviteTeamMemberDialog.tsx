import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail } from "lucide-react";

interface InviteTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
}

export const InviteTeamMemberDialog = ({
  open,
  onOpenChange,
  teamId,
  teamName,
}: InviteTeamMemberDialogProps) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [isLoading, setIsLoading] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Session expired. Please refresh the page.");
        return;
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from("team_members")
        .select("user_id, profiles!inner(email)")
        .eq("team_id", teamId)
        .single();

      // Check if there's a pending invitation
      const { data: existingInvitation } = await supabase
        .from("team_invitations")
        .select("id")
        .eq("team_id", teamId)
        .eq("invited_email", email.toLowerCase())
        .eq("status", "pending")
        .single();

      if (existingInvitation) {
        toast.error("An invitation has already been sent to this email");
        return;
      }

      // Create invitation
      const { data: invitation, error: inviteError } = await supabase
        .from("team_invitations")
        .insert({
          team_id: teamId,
          invited_by: session.user.id,
          invited_email: email.toLowerCase(),
          role: role,
        })
        .select()
        .single();

      if (inviteError) {
        console.error("Invitation error:", inviteError);
        toast.error("Failed to create invitation");
        return;
      }

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke("send-team-invitation", {
        body: { invitationId: invitation.id },
      });

      if (emailError) {
        console.error("Email error:", emailError);
        toast.error("Invitation created but email failed to send");
      } else {
        toast.success(`Invitation sent to ${email}`);
      }

      setEmail("");
      setRole("member");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Invite error:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={role}
              onValueChange={(value: "member" | "admin") => setRole(value)}
              disabled={isLoading}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {role === "member" ? "Can view and complete tasks" : "Can manage tasks and invite members"}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={isLoading}>
              <Mail className="mr-2 h-4 w-4" />
              {isLoading ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
