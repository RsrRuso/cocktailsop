-- Create table for batch QR codes
CREATE TABLE IF NOT EXISTS public.batch_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recipe_id TEXT NOT NULL,
  recipe_data JSONB NOT NULL,
  group_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_batch_qr_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_batch_qr_group FOREIGN KEY (group_id) REFERENCES public.mixologist_groups(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.batch_qr_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own QR codes
CREATE POLICY "Users can view own QR codes"
  ON public.batch_qr_codes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create QR codes
CREATE POLICY "Users can create QR codes"
  ON public.batch_qr_codes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own QR codes
CREATE POLICY "Users can update own QR codes"
  ON public.batch_qr_codes
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own QR codes
CREATE POLICY "Users can delete own QR codes"
  ON public.batch_qr_codes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Allow anyone to read active QR codes (for scanning)
CREATE POLICY "Anyone can read active QR codes"
  ON public.batch_qr_codes
  FOR SELECT
  USING (is_active = true);

-- Create index for faster lookups
CREATE INDEX idx_batch_qr_codes_user_id ON public.batch_qr_codes(user_id);
CREATE INDEX idx_batch_qr_codes_active ON public.batch_qr_codes(is_active);
CREATE INDEX idx_batch_qr_codes_expires ON public.batch_qr_codes(expires_at);