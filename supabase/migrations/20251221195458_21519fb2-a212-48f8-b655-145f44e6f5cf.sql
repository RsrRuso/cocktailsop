-- =============================================
-- SPECVERSE: Venue Verification & Employment System
-- =============================================

-- 1. Create enum types for venue verification and admin roles
CREATE TYPE public.venue_verification_status AS ENUM ('unverified', 'pending', 'verified');
CREATE TYPE public.venue_verification_method AS ENUM ('domain_email', 'phone', 'social_web', 'document');
CREATE TYPE public.venue_admin_role AS ENUM ('owner_admin', 'hr_admin', 'outlet_manager', 'bar_manager');
CREATE TYPE public.department_type AS ENUM ('bar', 'floor', 'kitchen', 'management', 'other');
CREATE TYPE public.claim_status AS ENUM ('draft', 'sent', 'under_review', 'approved', 'approved_with_edits', 'rejected', 'disputed', 'expired');

-- 2. Extend venues table with new fields
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS brand_name text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS instagram text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email_domain text,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS business_type text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS verification_method text,
ADD COLUMN IF NOT EXISTS verification_code text,
ADD COLUMN IF NOT EXISTS verification_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS verified_at timestamptz,
ADD COLUMN IF NOT EXISTS is_venue_account boolean DEFAULT false;

-- 3. Create venue_outlets table for multiple locations
CREATE TABLE IF NOT EXISTS public.venue_outlets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  address text,
  city text,
  country text,
  phone text,
  email text,
  is_headquarters boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Create venue_admins table for admin roles
CREATE TABLE IF NOT EXISTS public.venue_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  outlet_id uuid REFERENCES public.venue_outlets(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'outlet_manager',
  department text,
  is_primary boolean DEFAULT false,
  invited_by uuid,
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(venue_id, user_id, outlet_id)
);

-- 5. Create venue_verification_attempts table for tracking verification
CREATE TABLE IF NOT EXISTS public.venue_verification_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  method text NOT NULL,
  code text,
  email_sent_to text,
  phone_sent_to text,
  social_code text,
  document_url text,
  status text DEFAULT 'pending',
  attempted_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  expires_at timestamptz
);

-- 6. Extend employment_verifications table with more fields
ALTER TABLE public.employment_verifications
ADD COLUMN IF NOT EXISTS outlet_id uuid REFERENCES public.venue_outlets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS employment_type text DEFAULT 'full_time',
ADD COLUMN IF NOT EXISTS is_current boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS claim_status text DEFAULT 'sent',
ADD COLUMN IF NOT EXISTS reviewer_id uuid,
ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS original_data jsonb,
ADD COLUMN IF NOT EXISTS edited_data jsonb,
ADD COLUMN IF NOT EXISTS edits_accepted boolean,
ADD COLUMN IF NOT EXISTS proof_documents text[],
ADD COLUMN IF NOT EXISTS reference_name text,
ADD COLUMN IF NOT EXISTS reference_contact text;

-- 7. Create employment_claim_proofs table for private proof uploads
CREATE TABLE IF NOT EXISTS public.employment_claim_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid REFERENCES public.employment_verifications(id) ON DELETE CASCADE NOT NULL,
  proof_type text NOT NULL,
  file_url text NOT NULL,
  file_name text,
  uploaded_at timestamptz DEFAULT now()
);

-- 8. Create venue_verification_documents storage bucket reference
-- (Storage buckets are created separately, this is for tracking)

-- 9. Enable RLS on all new tables
ALTER TABLE public.venue_outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_claim_proofs ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies for venue_outlets
CREATE POLICY "Anyone can view venue outlets" ON public.venue_outlets
  FOR SELECT USING (true);

CREATE POLICY "Venue admins can manage outlets" ON public.venue_outlets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.venue_admins 
      WHERE venue_admins.venue_id = venue_outlets.venue_id 
      AND venue_admins.user_id = auth.uid()
    )
  );

-- 11. RLS Policies for venue_admins
CREATE POLICY "Anyone can view venue admins" ON public.venue_admins
  FOR SELECT USING (true);

CREATE POLICY "Owner admins can manage venue admins" ON public.venue_admins
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.venue_admins va
      WHERE va.venue_id = venue_admins.venue_id 
      AND va.user_id = auth.uid()
      AND va.role = 'owner_admin'
    )
    OR venue_admins.user_id = auth.uid()
  );

-- 12. RLS Policies for venue_verification_attempts
CREATE POLICY "Venue admins can view verification attempts" ON public.venue_verification_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.venue_admins 
      WHERE venue_admins.venue_id = venue_verification_attempts.venue_id 
      AND venue_admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Venue admins can create verification attempts" ON public.venue_verification_attempts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.venue_admins 
      WHERE venue_admins.venue_id = venue_verification_attempts.venue_id 
      AND venue_admins.user_id = auth.uid()
    )
  );

-- 13. RLS Policies for employment_claim_proofs
CREATE POLICY "Users can view their own claim proofs" ON public.employment_claim_proofs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employment_verifications 
      WHERE employment_verifications.id = employment_claim_proofs.claim_id 
      AND employment_verifications.user_id = auth.uid()
    )
  );

CREATE POLICY "Venue admins can view claim proofs" ON public.employment_claim_proofs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employment_verifications ev
      JOIN public.venue_admins va ON va.venue_id = ev.venue_id
      WHERE ev.id = employment_claim_proofs.claim_id 
      AND va.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload their own claim proofs" ON public.employment_claim_proofs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employment_verifications 
      WHERE employment_verifications.id = employment_claim_proofs.claim_id 
      AND employment_verifications.user_id = auth.uid()
    )
  );

-- 14. Update venues RLS to allow venue account creation
CREATE POLICY "Users can create venue accounts" ON public.venues
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Venue admins can update their venues" ON public.venues
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.venue_admins 
      WHERE venue_admins.venue_id = venues.id 
      AND venue_admins.user_id = auth.uid()
    )
  );

-- 15. Create function to generate verification code
CREATE OR REPLACE FUNCTION public.generate_verification_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'SV-' || upper(substring(md5(random()::text) from 1 for 6));
END;
$$;

-- 16. Create trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_venue_outlets_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_venue_outlets_updated_at
BEFORE UPDATE ON public.venue_outlets
FOR EACH ROW
EXECUTE FUNCTION public.update_venue_outlets_timestamp();

-- 17. Enable realtime for employment_verifications for claim updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.employment_verifications;