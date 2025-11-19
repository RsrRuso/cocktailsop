-- Fix access_requests RLS policies to avoid querying auth.users table directly

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view their own access requests" ON access_requests;

-- Recreate the policy without accessing auth.users table
-- Users can view their requests by user_id only (not by email comparison)
CREATE POLICY "Users can view their own access requests"
ON access_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);