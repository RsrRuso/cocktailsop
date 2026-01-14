-- Create a secure function to fetch invitation by token
-- This ensures only the intended recipient (by email match or user_id) can access the full details
CREATE OR REPLACE FUNCTION public.get_gm_invitation_by_token(p_token UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  v_user_id := auth.uid();
  
  -- Get user's email for verification
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;
  
  -- Get the invitation
  SELECT 
    gi.*,
    v.name as venue_name,
    v.brand_name as venue_brand_name,
    v.city as venue_city,
    vo.name as outlet_name
  INTO v_invitation
  FROM gm_invitations gi
  LEFT JOIN venues v ON v.id = gi.venue_id
  LEFT JOIN venue_outlets vo ON vo.id = gi.outlet_id
  WHERE gi.invitation_token = p_token;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found');
  END IF;
  
  -- Security check: Only allow access if:
  -- 1. User is the assigned recipient (recipient_user_id matches)
  -- 2. User's email matches the recipient email
  -- 3. User is an HR member (can view all invitations)
  IF v_user_id IS NOT NULL THEN
    IF v_invitation.recipient_user_id IS NOT NULL AND v_invitation.recipient_user_id = v_user_id THEN
      -- User is the assigned recipient
      NULL;
    ELSIF v_user_email IS NOT NULL AND LOWER(v_invitation.recipient_email) = LOWER(v_user_email) THEN
      -- User's email matches recipient email
      NULL;
    ELSIF EXISTS (SELECT 1 FROM hr_department_members WHERE user_id = v_user_id) THEN
      -- User is HR member
      NULL;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Access denied');
    END IF;
  ELSE
    -- Not authenticated - return limited info for display purposes only
    -- This allows the invitation page to show venue name before login
    RETURN jsonb_build_object(
      'success', true,
      'requires_auth', true,
      'id', v_invitation.id,
      'venue_name', COALESCE(v_invitation.venue_brand_name, v_invitation.venue_name),
      'position_title', v_invitation.position_title,
      'recipient_name', v_invitation.recipient_name,
      'status', v_invitation.status,
      'expires_at', v_invitation.expires_at
    );
  END IF;
  
  -- Mark as viewed if not already
  IF v_invitation.viewed_at IS NULL THEN
    UPDATE gm_invitations SET viewed_at = now() WHERE id = v_invitation.id;
  END IF;
  
  -- Return full invitation data
  RETURN jsonb_build_object(
    'success', true,
    'requires_auth', false,
    'id', v_invitation.id,
    'recipient_email', v_invitation.recipient_email,
    'recipient_name', v_invitation.recipient_name,
    'recipient_user_id', v_invitation.recipient_user_id,
    'venue_id', v_invitation.venue_id,
    'outlet_id', v_invitation.outlet_id,
    'position_title', v_invitation.position_title,
    'contract_terms', v_invitation.contract_terms,
    'salary_details', v_invitation.salary_details,
    'benefits_package', v_invitation.benefits_package,
    'start_date', v_invitation.start_date,
    'probation_period_days', v_invitation.probation_period_days,
    'status', v_invitation.status,
    'expires_at', v_invitation.expires_at,
    'venue_name', COALESCE(v_invitation.venue_brand_name, v_invitation.venue_name),
    'venue_city', v_invitation.venue_city,
    'outlet_name', v_invitation.outlet_name
  );
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.get_gm_invitation_by_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_gm_invitation_by_token(UUID) TO anon;