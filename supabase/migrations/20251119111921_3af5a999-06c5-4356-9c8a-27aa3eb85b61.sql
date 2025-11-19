-- Create access requests table
CREATE TABLE public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
ON public.access_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Managers can view all requests
CREATE POLICY "Managers can view all requests"
ON public.access_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('manager', 'founder')
  )
);

-- Anyone can create a request (for QR scan)
CREATE POLICY "Anyone can create request"
ON public.access_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Managers can update requests (approve/reject)
CREATE POLICY "Managers can update requests"
ON public.access_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('manager', 'founder')
  )
);

-- Create index for faster lookups
CREATE INDEX idx_access_requests_qr_code ON public.access_requests(qr_code_id);
CREATE INDEX idx_access_requests_user ON public.access_requests(user_id);
CREATE INDEX idx_access_requests_status ON public.access_requests(status);