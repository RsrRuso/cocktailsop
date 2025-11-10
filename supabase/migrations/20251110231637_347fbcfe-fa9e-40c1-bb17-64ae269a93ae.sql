-- Fix infinite recursion in group_members RLS policies
DROP POLICY IF EXISTS "Users can view group members of their groups" ON group_members;
DROP POLICY IF EXISTS "Users can insert group members" ON group_members;
DROP POLICY IF EXISTS "Admins can update group members" ON group_members;
DROP POLICY IF EXISTS "Admins can delete group members" ON group_members;

-- Create simpler, non-recursive policies for group_members
CREATE POLICY "Users can view group members of their groups"
  ON group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND auth.uid() = ANY(c.participant_ids)
    )
  );

CREATE POLICY "Group creators can insert members"
  ON group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND c.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins can update members"
  ON group_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.conversation_id = group_members.conversation_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );

CREATE POLICY "Admins can remove members"
  ON group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.conversation_id = group_members.conversation_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'admin'
    )
  );