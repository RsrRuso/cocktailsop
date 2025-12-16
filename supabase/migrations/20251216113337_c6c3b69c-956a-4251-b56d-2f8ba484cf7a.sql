-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Authenticated users can view groups for PIN access" ON public.mixologist_groups;

-- Allow anyone (including anonymous/not logged in users) to view groups for PIN access
-- The PIN itself provides the security layer for authentication
CREATE POLICY "Anyone can view groups for PIN selection"
  ON public.mixologist_groups
  FOR SELECT
  USING (true);