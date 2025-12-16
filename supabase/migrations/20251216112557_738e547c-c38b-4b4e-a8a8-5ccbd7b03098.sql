-- Allow authenticated users to view all groups for PIN access selection
-- The PIN itself provides the security layer
CREATE POLICY "Authenticated users can view groups for PIN access"
  ON public.mixologist_groups
  FOR SELECT
  USING (auth.role() = 'authenticated');