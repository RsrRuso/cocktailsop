-- Allow any logged-in user to read QR transfer/receiving contexts
-- This fixes "QR expired" for staff who didn't generate the code

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can read transfer QR codes" ON public.transfer_qr_codes;
DROP POLICY IF EXISTS "Authenticated users can read receiving QR codes" ON public.receiving_qr_codes;

-- Enable RLS
ALTER TABLE public.transfer_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receiving_qr_codes ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to SELECT QR metadata
CREATE POLICY "Authenticated users can read transfer QR codes"
ON public.transfer_qr_codes
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read receiving QR codes"
ON public.receiving_qr_codes
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);