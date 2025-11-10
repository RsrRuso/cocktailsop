-- Add DELETE policy for conversations
-- Only group creators can delete groups, and participants can delete 1-on-1 conversations
CREATE POLICY "Users can delete conversations"
  ON conversations FOR DELETE
  USING (
    -- Group creators can delete groups
    (is_group = true AND created_by = auth.uid())
    OR
    -- Any participant can delete 1-on-1 conversations
    (is_group = false AND auth.uid() = ANY(participant_ids))
  );