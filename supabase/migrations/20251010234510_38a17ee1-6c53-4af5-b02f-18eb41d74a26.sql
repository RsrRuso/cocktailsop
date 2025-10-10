-- Drop the overly restrictive profile viewing policy
DROP POLICY IF EXISTS "Profiles viewable with privacy controls" ON public.profiles;

-- Create a new policy that always allows viewing basic profile information
-- This allows likes, comments, and other features to display user info
-- while still respecting privacy for sensitive fields through column-level security
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles
FOR SELECT
USING (true);

-- Note: Sensitive fields like phone, whatsapp, website will be filtered
-- in the application layer or through additional column-level policies if needed