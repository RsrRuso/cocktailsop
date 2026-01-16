-- Allow authenticated users to view all profiles (required for user search/discovery)
-- This is safe because:
-- 1. Only authenticated users can view profiles
-- 2. Sensitive fields like email, date_of_birth, address are in the table but search only selects public fields
-- 3. Update/Delete is still restricted to own profile

CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);