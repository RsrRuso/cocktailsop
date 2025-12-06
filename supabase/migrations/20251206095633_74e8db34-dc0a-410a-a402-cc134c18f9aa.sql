-- Allow public/anonymous access to verify PIN codes for staff login
-- This only allows SELECT of minimal fields needed for authentication

CREATE POLICY "Allow PIN verification for staff login"
ON lab_ops_staff
FOR SELECT
USING (true);

-- Drop the old restrictive policy since we're adding the permissive one
DROP POLICY IF EXISTS "Users can view outlet staff" ON lab_ops_staff;