-- Create enum for invitation status
CREATE TYPE public.gm_invitation_status AS ENUM ('pending', 'accepted', 'rejected', 'expired', 'cancelled');

-- Create GM invitations table for HR to invite GMs
CREATE TABLE public.gm_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient info
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Venue/Outlet assignment
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES public.venue_outlets(id) ON DELETE SET NULL,
  
  -- Contract details
  position_title TEXT NOT NULL DEFAULT 'General Manager',
  contract_terms JSONB NOT NULL DEFAULT '{}',
  policies_accepted BOOLEAN DEFAULT FALSE,
  terms_version TEXT DEFAULT '1.0',
  
  -- Compensation & benefits (stored in contract_terms but highlighted)
  salary_details JSONB,
  benefits_package JSONB,
  start_date DATE,
  probation_period_days INTEGER DEFAULT 90,
  
  -- Workflow
  status public.gm_invitation_status NOT NULL DEFAULT 'pending',
  invitation_token UUID NOT NULL DEFAULT gen_random_uuid(),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  
  -- HR tracking
  sent_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  hr_notes TEXT,
  
  -- Confirmation details
  confirmation_ip TEXT,
  confirmation_device TEXT,
  digital_signature TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for quick lookups
CREATE INDEX idx_gm_invitations_token ON public.gm_invitations(invitation_token);
CREATE INDEX idx_gm_invitations_recipient ON public.gm_invitations(recipient_email);
CREATE INDEX idx_gm_invitations_venue ON public.gm_invitations(venue_id);
CREATE INDEX idx_gm_invitations_status ON public.gm_invitations(status);

-- Enable RLS
ALTER TABLE public.gm_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- HR members can view all invitations
CREATE POLICY "HR members can view all invitations"
ON public.gm_invitations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hr_department_members
    WHERE user_id = auth.uid()
  )
);

-- HR members can create invitations
CREATE POLICY "HR members can create invitations"
ON public.gm_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.hr_department_members
    WHERE user_id = auth.uid()
  )
);

-- HR members can update invitations
CREATE POLICY "HR members can update invitations"
ON public.gm_invitations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hr_department_members
    WHERE user_id = auth.uid()
  )
);

-- Recipients can view their own invitations
CREATE POLICY "Recipients can view own invitations"
ON public.gm_invitations
FOR SELECT
TO authenticated
USING (recipient_user_id = auth.uid());

-- Recipients can update their own invitations (accept/reject)
CREATE POLICY "Recipients can respond to own invitations"
ON public.gm_invitations
FOR UPDATE
TO authenticated
USING (recipient_user_id = auth.uid())
WITH CHECK (
  recipient_user_id = auth.uid() AND
  status = 'pending'
);

-- Create trigger for updated_at
CREATE TRIGGER update_gm_invitations_updated_at
BEFORE UPDATE ON public.gm_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create GM role in app_role enum if not exists (for role-based access)
DO $$ 
BEGIN
  -- Check if 'gm' value exists in app_role enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'gm' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gm';
  END IF;
END $$;

-- Function to accept GM invitation and grant access
CREATE OR REPLACE FUNCTION public.accept_gm_invitation(
  p_invitation_token UUID,
  p_digital_signature TEXT DEFAULT NULL,
  p_device_info TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get the invitation
  SELECT * INTO v_invitation
  FROM gm_invitations
  WHERE invitation_token = p_invitation_token
    AND status = 'pending'
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found, expired, or already responded');
  END IF;
  
  -- Update invitation status
  UPDATE gm_invitations
  SET 
    status = 'accepted',
    recipient_user_id = v_user_id,
    policies_accepted = true,
    responded_at = now(),
    digital_signature = p_digital_signature,
    confirmation_device = p_device_info,
    updated_at = now()
  WHERE id = v_invitation.id;
  
  -- Grant GM role to user
  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, 'gm')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Add as venue admin with GM permissions
  INSERT INTO venue_admins (venue_id, user_id, role, permissions, added_by)
  VALUES (
    v_invitation.venue_id,
    v_user_id,
    'gm',
    '["full_access", "staff_management", "financial", "inventory", "approvals"]'::jsonb,
    v_invitation.sent_by
  )
  ON CONFLICT (venue_id, user_id) 
  DO UPDATE SET 
    role = 'gm',
    permissions = '["full_access", "staff_management", "financial", "inventory", "approvals"]'::jsonb;
  
  RETURN jsonb_build_object(
    'success', true, 
    'venue_id', v_invitation.venue_id,
    'message', 'Welcome! You now have GM access.'
  );
END;
$$;

-- Function to reject GM invitation
CREATE OR REPLACE FUNCTION public.reject_gm_invitation(
  p_invitation_token UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Get the invitation
  SELECT * INTO v_invitation
  FROM gm_invitations
  WHERE invitation_token = p_invitation_token
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found or already responded');
  END IF;
  
  -- Update invitation status
  UPDATE gm_invitations
  SET 
    status = 'rejected',
    responded_at = now(),
    hr_notes = COALESCE(hr_notes || E'\n', '') || 'Rejected: ' || COALESCE(p_reason, 'No reason provided'),
    updated_at = now()
  WHERE id = v_invitation.id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Invitation declined');
END;
$$;

-- Enable realtime for gm_invitations
ALTER PUBLICATION supabase_realtime ADD TABLE public.gm_invitations;