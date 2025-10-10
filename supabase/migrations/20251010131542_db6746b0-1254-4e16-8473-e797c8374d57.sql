-- Fix the conversations INSERT policy to avoid set-returning function error
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;

CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
WITH CHECK (participant_ids @> ARRAY[auth.uid()]);

-- This uses the array contains operator (@>) instead of ANY()
-- which avoids the set-returning function error