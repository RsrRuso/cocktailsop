-- Enable group members to update and delete master spirits
-- First, drop existing restrictive policies if any
DROP POLICY IF EXISTS "Users can update their own spirits" ON master_spirits;
DROP POLICY IF EXISTS "Users can delete their own spirits" ON master_spirits;
DROP POLICY IF EXISTS "Users can insert spirits" ON master_spirits;
DROP POLICY IF EXISTS "Users can view spirits" ON master_spirits;

-- Create new permissive policies allowing all authenticated users to manage spirits
CREATE POLICY "Authenticated users can view all spirits"
ON master_spirits FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert spirits"
ON master_spirits FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update any spirit"
ON master_spirits FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete any spirit"
ON master_spirits FOR DELETE
TO authenticated
USING (true);