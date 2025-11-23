-- Create receiving_qr_codes table
CREATE TABLE IF NOT EXISTS public.receiving_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id TEXT NOT NULL UNIQUE,
  to_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_receiving_qr_codes_qr_code_id ON public.receiving_qr_codes(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_receiving_qr_codes_user_id ON public.receiving_qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_receiving_qr_codes_to_store_id ON public.receiving_qr_codes(to_store_id);

-- Enable RLS
ALTER TABLE public.receiving_qr_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own receiving QR codes"
  ON public.receiving_qr_codes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own receiving QR codes"
  ON public.receiving_qr_codes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receiving QR codes"
  ON public.receiving_qr_codes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receiving QR codes"
  ON public.receiving_qr_codes
  FOR DELETE
  USING (auth.uid() = user_id);