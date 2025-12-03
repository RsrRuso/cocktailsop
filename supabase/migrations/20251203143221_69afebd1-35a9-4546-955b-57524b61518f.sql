-- Drop existing RLS policies for batch_productions
DROP POLICY IF EXISTS "Users can view own batch productions" ON batch_productions;
DROP POLICY IF EXISTS "Users can view group batch productions" ON batch_productions;
DROP POLICY IF EXISTS "Users can view shared group batch productions" ON batch_productions;
DROP POLICY IF EXISTS "Users can insert own batch productions" ON batch_productions;
DROP POLICY IF EXISTS "Users can update own batch productions" ON batch_productions;
DROP POLICY IF EXISTS "Users can update group batch productions" ON batch_productions;
DROP POLICY IF EXISTS "Users can delete own batch productions" ON batch_productions;
DROP POLICY IF EXISTS "Users can delete group batch productions" ON batch_productions;
DROP POLICY IF EXISTS "Group members can delete productions" ON batch_productions;
DROP POLICY IF EXISTS "Group admins can update any group production" ON batch_productions;
DROP POLICY IF EXISTS "Group admins can delete any group production" ON batch_productions;

-- SELECT: Users can only view batch productions from groups they belong to
CREATE POLICY "Users can view group batch productions"
ON batch_productions FOR SELECT
USING (
  group_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM mixologist_group_members
    WHERE mixologist_group_members.group_id = batch_productions.group_id
    AND mixologist_group_members.user_id = auth.uid()
  )
);

-- INSERT: Users can create batch productions only in groups they belong to
CREATE POLICY "Users can insert batch productions in their groups"
ON batch_productions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  group_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM mixologist_group_members
    WHERE mixologist_group_members.group_id = batch_productions.group_id
    AND mixologist_group_members.user_id = auth.uid()
  )
);

-- UPDATE: Users can update their own productions OR group admins can update any group production
CREATE POLICY "Users can update own or admin can update group productions"
ON batch_productions FOR UPDATE
USING (
  auth.uid() = user_id OR
  (
    group_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM mixologist_group_members
      WHERE mixologist_group_members.group_id = batch_productions.group_id
      AND mixologist_group_members.user_id = auth.uid()
      AND mixologist_group_members.role = 'admin'
    )
  )
);

-- DELETE: Users can delete their own productions OR group admins can delete any group production
CREATE POLICY "Users can delete own or admin can delete group productions"
ON batch_productions FOR DELETE
USING (
  auth.uid() = user_id OR
  (
    group_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM mixologist_group_members
      WHERE mixologist_group_members.group_id = batch_productions.group_id
      AND mixologist_group_members.user_id = auth.uid()
      AND mixologist_group_members.role = 'admin'
    )
  )
);