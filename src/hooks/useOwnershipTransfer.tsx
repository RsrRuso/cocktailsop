import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OwnershipRequest {
  id: string;
  venue_id: string;
  requester_id: string;
  current_owner_id: string | null;
  request_type: 'ownership_transfer' | 'admin_promotion' | 'admin_request';
  status: 'pending_hr_review' | 'hr_approved' | 'hr_rejected' | 'completed' | 'cancelled';
  proof_documents: string[];
  business_registration: string | null;
  authorization_letter_url: string | null;
  additional_notes: string | null;
  hr_reviewer_id: string | null;
  hr_reviewed_at: string | null;
  hr_notes: string | null;
  hr_decision_reason: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  venue?: {
    name: string;
    city: string | null;
  };
  requester?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  current_owner?: {
    full_name: string | null;
    username: string | null;
  };
}

export interface HRMember {
  id: string;
  user_id: string;
  role: 'hr_staff' | 'hr_manager' | 'hr_director';
  can_approve_transfers: boolean;
  department: string;
  created_at: string;
}

export const useOwnershipTransfer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createOwnershipRequest = async (data: {
    venue_id: string;
    request_type: 'ownership_transfer' | 'admin_promotion' | 'admin_request';
    proof_documents?: string[];
    business_registration?: string;
    authorization_letter_url?: string;
    additional_notes?: string;
  }) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current owner
      const { data: venue } = await supabase
        .from('venues')
        .select('owner_id')
        .eq('id', data.venue_id)
        .single();

      const { error } = await supabase
        .from('venue_ownership_requests')
        .insert({
          venue_id: data.venue_id,
          requester_id: user.id,
          current_owner_id: venue?.owner_id,
          request_type: data.request_type,
          proof_documents: data.proof_documents || [],
          business_registration: data.business_registration,
          authorization_letter_url: data.authorization_letter_url,
          additional_notes: data.additional_notes,
        });

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your request has been sent to HR for review.",
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const getMyRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('venue_ownership_requests')
      .select('*')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      return [];
    }

    // Fetch venue details
    const venueIds = [...new Set(data.map(r => r.venue_id))];
    const { data: venues } = await supabase
      .from('venues')
      .select('id, name, city')
      .in('id', venueIds);

    const venueMap = new Map(venues?.map(v => [v.id, v]) || []);

    return data.map(request => ({
      ...request,
      venue: venueMap.get(request.venue_id),
    })) as OwnershipRequest[];
  };

  const getPendingRequests = async () => {
    const { data, error } = await supabase
      .from('venue_ownership_requests')
      .select('*')
      .eq('status', 'pending_hr_review')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending requests:', error);
      return [];
    }

    // Fetch venue and user details
    const venueIds = [...new Set(data.map(r => r.venue_id))];
    const requesterIds = [...new Set(data.map(r => r.requester_id))];
    const ownerIds = [...new Set(data.filter(r => r.current_owner_id).map(r => r.current_owner_id))];

    const [venuesRes, requestersRes, ownersRes] = await Promise.all([
      supabase.from('venues').select('id, name, city').in('id', venueIds),
      supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', requesterIds),
      ownerIds.length > 0 
        ? supabase.from('profiles').select('id, full_name, username').in('id', ownerIds)
        : { data: [] },
    ]);

    const venueMap = new Map((venuesRes.data || []).map(v => [v.id, v] as const));
    const requesterMap = new Map((requestersRes.data || []).map(p => [p.id, p] as const));
    const ownerMap = new Map((ownersRes.data || []).map(p => [p.id, p] as const));

    return data.map(request => ({
      ...request,
      venue: venueMap.get(request.venue_id),
      requester: requesterMap.get(request.requester_id),
      current_owner: request.current_owner_id ? ownerMap.get(request.current_owner_id) : null,
    })) as OwnershipRequest[];
  };

  const reviewRequest = async (
    requestId: string,
    decision: 'approve' | 'reject',
    notes?: string,
    reason?: string
  ) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('hr_review_ownership_request', {
        p_request_id: requestId,
        p_hr_user_id: user.id,
        p_decision: decision,
        p_notes: notes || null,
        p_reason: reason || null,
      });

      if (error) throw error;

      const result = data as { success: boolean; message?: string; error?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to process request');
      }

      toast({
        title: decision === 'approve' ? "Request Approved" : "Request Rejected",
        description: result.message,
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  const checkIsHRMember = async (): Promise<HRMember | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('hr_department_members')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !data) return null;
    return data as HRMember;
  };

  const cancelRequest = async (requestId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('venue_ownership_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('status', 'pending_hr_review');

      if (error) throw error;

      toast({
        title: "Request Cancelled",
        description: "Your ownership request has been cancelled.",
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    createOwnershipRequest,
    getMyRequests,
    getPendingRequests,
    reviewRequest,
    checkIsHRMember,
    cancelRequest,
  };
};
