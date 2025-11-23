-- Create transfer_qr_codes table
CREATE TABLE IF NOT EXISTS public.transfer_qr_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_code_id TEXT NOT NULL UNIQUE,
  from_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transfer_qr_codes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own transfer QR codes"
ON public.transfer_qr_codes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transfer QR codes"
ON public.transfer_qr_codes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transfer QR codes"
ON public.transfer_qr_codes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transfer QR codes"
ON public.transfer_qr_codes
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transfer_qr_codes_qr_code_id ON public.transfer_qr_codes(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_transfer_qr_codes_user_id ON public.transfer_qr_codes(user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_transfer_qr_codes_updated_at
BEFORE UPDATE ON public.transfer_qr_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
