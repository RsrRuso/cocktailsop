
-- Create venue ownership transfer requests table with HR workflow
CREATE TABLE public.venue_ownership_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  current_owner_id UUID,
  request_type TEXT NOT NULL CHECK (request_type IN ('ownership_transfer', 'admin_promotion', 'admin_request')),
  status TEXT NOT NULL DEFAULT 'pending_hr_review' CHECK (status IN ('pending_hr_review', 'hr_approved', 'hr_rejected', 'completed', 'cancelled')),
  
  -- Documentation/proof
  proof_documents TEXT[] DEFAULT '{}',
  business_registration TEXT,
  authorization_letter_url TEXT,
  additional_notes TEXT,
  
  -- HR review fields
  hr_reviewer_id UUID,
  hr_reviewed_at TIMESTAMPTZ,
  hr_notes TEXT,
  hr_decision_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create HR department members table
CREATE TABLE public.hr_department_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'hr_staff' CHECK (role IN ('hr_staff', 'hr_manager', 'hr_director')),
  can_approve_transfers BOOLEAN DEFAULT false,
  department TEXT DEFAULT 'Human Resources',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create venue admin activity tracking
CREATE TABLE public.venue_admin_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create ownership transfer history
CREATE TABLE public.venue_ownership_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  previous_owner_id UUID,
  new_owner_id UUID NOT NULL,
  transfer_request_id UUID REFERENCES public.venue_ownership_requests(id),
  hr_approver_id UUID,
  transfer_reason TEXT,
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.venue_ownership_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_admin_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_ownership_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for venue_ownership_requests
CREATE POLICY "Users can view their own requests"
  ON public.venue_ownership_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = current_owner_id);

CREATE POLICY "HR members can view all requests"
  ON public.venue_ownership_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.hr_department_members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create ownership requests"
  ON public.venue_ownership_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "HR members can update requests"
  ON public.venue_ownership_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.hr_department_members 
    WHERE user_id = auth.uid() AND can_approve_transfers = true
  ));

-- RLS Policies for hr_department_members
CREATE POLICY "HR members can view HR team"
  ON public.hr_department_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.hr_department_members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "HR directors can manage HR team"
  ON public.hr_department_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.hr_department_members 
    WHERE user_id = auth.uid() AND role = 'hr_director'
  ));

-- RLS Policies for venue_admin_activity
CREATE POLICY "Venue admins can view activity"
  ON public.venue_admin_activity FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.venue_admins 
    WHERE venue_id = venue_admin_activity.venue_id AND user_id = auth.uid()
  ));

CREATE POLICY "HR can view all activity"
  ON public.venue_admin_activity FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.hr_department_members 
    WHERE user_id = auth.uid()
  ));

-- RLS Policies for venue_ownership_history
CREATE POLICY "Anyone involved can view history"
  ON public.venue_ownership_history FOR SELECT
  USING (
    auth.uid() = previous_owner_id OR 
    auth.uid() = new_owner_id OR
    EXISTS (SELECT 1 FROM public.hr_department_members WHERE user_id = auth.uid())
  );

-- Function to process HR-approved ownership transfer
CREATE OR REPLACE FUNCTION public.process_hr_approved_transfer(
  p_request_id UUID,
  p_hr_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_result JSONB;
BEGIN
  -- Verify HR user has approval rights
  IF NOT EXISTS (
    SELECT 1 FROM hr_department_members 
    WHERE user_id = p_hr_user_id AND can_approve_transfers = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: HR approval rights required');
  END IF;

  -- Get and lock the request
  SELECT * INTO v_request
  FROM venue_ownership_requests
  WHERE id = p_request_id AND status = 'hr_approved'
  FOR UPDATE;

  IF v_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or not HR approved');
  END IF;

  -- Update venue owner
  UPDATE venues
  SET owner_id = v_request.requester_id, updated_at = now()
  WHERE id = v_request.venue_id;

  -- Update or demote current owner in venue_admins
  UPDATE venue_admins
  SET role = 'manager', updated_at = now()
  WHERE venue_id = v_request.venue_id AND user_id = v_request.current_owner_id AND role = 'owner';

  -- Add new owner as admin with owner role
  INSERT INTO venue_admins (venue_id, user_id, role, department, created_at, updated_at)
  VALUES (v_request.venue_id, v_request.requester_id, 'owner', 'Management', now(), now())
  ON CONFLICT (venue_id, user_id) DO UPDATE SET role = 'owner', updated_at = now();

  -- Record in history
  INSERT INTO venue_ownership_history (venue_id, previous_owner_id, new_owner_id, transfer_request_id, hr_approver_id, transfer_reason)
  VALUES (v_request.venue_id, v_request.current_owner_id, v_request.requester_id, p_request_id, p_hr_user_id, v_request.additional_notes);

  -- Mark request as completed
  UPDATE venue_ownership_requests
  SET status = 'completed', completed_at = now(), updated_at = now()
  WHERE id = p_request_id;

  -- Log activity
  INSERT INTO venue_admin_activity (venue_id, admin_id, action_type, metadata)
  VALUES (v_request.venue_id, v_request.requester_id, 'ownership_transferred', 
    jsonb_build_object('request_id', p_request_id, 'hr_approver', p_hr_user_id, 'previous_owner', v_request.current_owner_id));

  RETURN jsonb_build_object('success', true, 'message', 'Ownership transferred successfully');
END;
$$;

-- Function for HR to approve/reject requests
CREATE OR REPLACE FUNCTION public.hr_review_ownership_request(
  p_request_id UUID,
  p_hr_user_id UUID,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status TEXT;
BEGIN
  -- Verify HR user
  IF NOT EXISTS (
    SELECT 1 FROM hr_department_members 
    WHERE user_id = p_hr_user_id AND can_approve_transfers = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: HR approval rights required');
  END IF;

  -- Determine new status
  IF p_decision = 'approve' THEN
    v_new_status := 'hr_approved';
  ELSIF p_decision = 'reject' THEN
    v_new_status := 'hr_rejected';
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid decision. Use approve or reject');
  END IF;

  -- Update request
  UPDATE venue_ownership_requests
  SET 
    status = v_new_status,
    hr_reviewer_id = p_hr_user_id,
    hr_reviewed_at = now(),
    hr_notes = p_notes,
    hr_decision_reason = p_reason,
    updated_at = now()
  WHERE id = p_request_id AND status = 'pending_hr_review';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found or already reviewed');
  END IF;

  -- If approved, process the transfer
  IF v_new_status = 'hr_approved' THEN
    RETURN process_hr_approved_transfer(p_request_id, p_hr_user_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Request ' || p_decision || 'd successfully');
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_ownership_requests_status ON public.venue_ownership_requests(status);
CREATE INDEX idx_ownership_requests_venue ON public.venue_ownership_requests(venue_id);
CREATE INDEX idx_hr_members_user ON public.hr_department_members(user_id);
CREATE INDEX idx_admin_activity_venue ON public.venue_admin_activity(venue_id);
