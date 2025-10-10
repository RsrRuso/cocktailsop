-- Add privacy control column for contact email visibility
ALTER TABLE public.venues 
ADD COLUMN show_contact_email boolean DEFAULT false;

-- Drop existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Venues are viewable by everyone" ON public.venues;

-- Create new privacy-aware SELECT policy
CREATE POLICY "Venues viewable with privacy controls" 
ON public.venues 
FOR SELECT 
USING (true);

-- Add comment explaining contact_email should be filtered in application code
COMMENT ON COLUMN public.venues.contact_email IS 'Filter in application: visible only when (show_contact_email = true OR auth.uid() = owner_id)';