import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface GMInvitation {
  id: string;
  recipient_email: string;
  recipient_name: string;
  recipient_user_id: string | null;
  venue_id: string;
  outlet_id: string | null;
  position_title: string;
  contract_terms: Record<string, any>;
  salary_details: Record<string, any> | null;
  benefits_package: string[] | null;
  start_date: string | null;
  probation_period_days: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  invitation_token: string;
  sent_at: string | null;
  viewed_at: string | null;
  responded_at: string | null;
  expires_at: string;
  sent_by: string;
  hr_notes: string | null;
  created_at: string;
  venues?: {
    name: string;
    brand_name: string;
    city: string;
  };
  venue_outlets?: {
    name: string;
  } | null;
  profiles?: {
    full_name: string;
  };
}

interface CreateInvitationData {
  recipient_email: string;
  recipient_name: string;
  venue_id: string;
  outlet_id?: string;
  position_title?: string;
  contract_terms?: Record<string, any>;
  salary_details?: Record<string, any>;
  benefits_package?: string[];
  start_date?: string;
  probation_period_days?: number;
  hr_notes?: string;
}

export const useGMInvitations = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<GMInvitation[]>([]);

  const fetchInvitations = useCallback(async (filters?: { status?: string; venue_id?: string }) => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from("gm_invitations")
        .select(`
          *,
          venues (name, brand_name, city),
          venue_outlets (name)
        `)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status as any);
      }
      if (filters?.venue_id) {
        query = query.eq("venue_id", filters.venue_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvitations(data as GMInvitation[]);
    } catch (err: any) {
      console.error("Error fetching invitations:", err);
      toast.error("Failed to load invitations");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createInvitation = useCallback(async (data: CreateInvitationData) => {
    if (!user) {
      toast.error("Not authenticated");
      return null;
    }

    setLoading(true);
    try {
      // Create the invitation
      const { data: invitation, error } = await supabase
        .from("gm_invitations")
        .insert({
          ...data,
          sent_by: user.id,
          contract_terms: data.contract_terms || {},
        })
        .select(`
          *,
          venues (name, brand_name, city, region),
          venue_outlets (name)
        `)
        .single();

      if (error) throw error;

      // Get sender's name for the email
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      // Send the invitation email
      const emailPayload = {
        invitation_id: invitation.id,
        recipient_email: invitation.recipient_email,
        recipient_name: invitation.recipient_name,
        venue_name: invitation.venues?.brand_name || invitation.venues?.name,
        outlet_name: invitation.venue_outlets?.name,
        position_title: invitation.position_title,
        contract_terms: invitation.contract_terms,
        salary_details: invitation.salary_details,
        benefits_package: invitation.benefits_package,
        start_date: invitation.start_date,
        invitation_token: invitation.invitation_token,
        expires_at: invitation.expires_at,
        hr_sender_name: senderProfile?.full_name || "HR Department",
      };

      const { error: emailError } = await supabase.functions.invoke("send-gm-invitation", {
        body: emailPayload,
      });

      if (emailError) {
        console.error("Error sending email:", emailError);
        toast.warning("Invitation created but email failed to send");
      } else {
        toast.success("Invitation sent successfully!");
      }

      return invitation as GMInvitation;
    } catch (err: any) {
      console.error("Error creating invitation:", err);
      toast.error(err.message || "Failed to create invitation");
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const cancelInvitation = useCallback(async (invitationId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("gm_invitations")
        .update({ status: "cancelled" })
        .eq("id", invitationId);

      if (error) throw error;

      toast.success("Invitation cancelled");
      await fetchInvitations();
    } catch (err: any) {
      console.error("Error cancelling invitation:", err);
      toast.error("Failed to cancel invitation");
    } finally {
      setLoading(false);
    }
  }, [fetchInvitations]);

  const resendInvitation = useCallback(async (invitation: GMInvitation) => {
    if (!user) return;

    setLoading(true);
    try {
      // Get sender's name
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      // Re-send the email
      const emailPayload = {
        invitation_id: invitation.id,
        recipient_email: invitation.recipient_email,
        recipient_name: invitation.recipient_name,
        venue_name: invitation.venues?.brand_name || invitation.venues?.name,
        position_title: invitation.position_title,
        contract_terms: invitation.contract_terms,
        salary_details: invitation.salary_details,
        benefits_package: invitation.benefits_package,
        start_date: invitation.start_date,
        invitation_token: invitation.invitation_token,
        expires_at: invitation.expires_at,
        hr_sender_name: senderProfile?.full_name || "HR Department",
      };

      const { error } = await supabase.functions.invoke("send-gm-invitation", {
        body: emailPayload,
      });

      if (error) throw error;

      toast.success("Invitation resent!");
    } catch (err: any) {
      console.error("Error resending invitation:", err);
      toast.error("Failed to resend invitation");
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    loading,
    invitations,
    fetchInvitations,
    createInvitation,
    cancelInvitation,
    resendInvitation,
  };
};
