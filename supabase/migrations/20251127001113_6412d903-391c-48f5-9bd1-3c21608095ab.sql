-- Create qr_codes table for FIFO workspace access
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  qr_type TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for qr_codes
CREATE POLICY "Users can view QR codes for their workspaces"
  ON public.qr_codes FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
      UNION
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create QR codes for their workspaces"
  ON public.qr_codes FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own QR codes"
  ON public.qr_codes FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own QR codes"
  ON public.qr_codes FOR DELETE
  USING (created_by = auth.uid());

-- Create index for performance
CREATE INDEX idx_qr_codes_workspace_id ON public.qr_codes(workspace_id);
CREATE INDEX idx_qr_codes_qr_type ON public.qr_codes(qr_type);

-- Anyone can view QR codes (for scanning)
CREATE POLICY "Anyone can view QR codes by ID"
  ON public.qr_codes FOR SELECT
  USING (true);