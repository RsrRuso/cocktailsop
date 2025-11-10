-- Drop policies first
DROP POLICY IF EXISTS "Admins can update members" ON group_members;
DROP POLICY IF EXISTS "Admins can remove members" ON group_members;

-- Then drop the function
DROP FUNCTION IF EXISTS is_group_admin(uuid, uuid);

-- Create new policies that check conversation ownership instead
CREATE POLICY "Group creators and current user can update members"
  ON group_members FOR UPDATE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Group creators can remove members"
  ON group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND c.created_by = auth.uid()
    )
  );