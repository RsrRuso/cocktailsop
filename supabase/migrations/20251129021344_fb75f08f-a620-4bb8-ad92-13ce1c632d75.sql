-- Drop existing policies that are too restrictive
DROP POLICY IF EXISTS "Group creators can add members" ON mixologist_group_members;
DROP POLICY IF EXISTS "Group creators can remove members" ON mixologist_group_members;
DROP POLICY IF EXISTS "Users can view members of their groups" ON mixologist_group_members;

-- Create comprehensive policies that allow both creators AND admins to manage members
-- Policy 1: Allow viewing members if you're the creator, an admin, or a member
CREATE POLICY "Users can view group members"
ON mixologist_group_members FOR SELECT
USING (
  -- You can see members if you're the group creator
  EXISTS (
    SELECT 1 FROM mixologist_groups g
    WHERE g.id = mixologist_group_members.group_id 
    AND g.created_by = auth.uid()
  )
  OR
  -- OR if you're an admin of the group
  EXISTS (
    SELECT 1 FROM mixologist_group_members m
    WHERE m.group_id = mixologist_group_members.group_id
    AND m.user_id = auth.uid()
    AND m.role = 'admin'
  )
  OR
  -- OR if you're a member of the group
  is_mixologist_group_member(auth.uid(), mixologist_group_members.group_id)
);

-- Policy 2: Allow adding members if you're the creator or an admin
CREATE POLICY "Creators and admins can add members"
ON mixologist_group_members FOR INSERT
WITH CHECK (
  -- You can add members if you're the group creator
  EXISTS (
    SELECT 1 FROM mixologist_groups g
    WHERE g.id = mixologist_group_members.group_id 
    AND g.created_by = auth.uid()
  )
  OR
  -- OR if you're an admin of the group
  EXISTS (
    SELECT 1 FROM mixologist_group_members m
    WHERE m.group_id = mixologist_group_members.group_id
    AND m.user_id = auth.uid()
    AND m.role = 'admin'
  )
);

-- Policy 3: Allow removing members if you're the creator or an admin (but not remove admins)
CREATE POLICY "Creators and admins can remove members"
ON mixologist_group_members FOR DELETE
USING (
  -- Only allow deletion if the member being deleted is NOT an admin
  mixologist_group_members.role != 'admin'
  AND
  (
    -- AND you're the group creator
    EXISTS (
      SELECT 1 FROM mixologist_groups g
      WHERE g.id = mixologist_group_members.group_id 
      AND g.created_by = auth.uid()
    )
    OR
    -- OR you're an admin of the group
    EXISTS (
      SELECT 1 FROM mixologist_group_members m
      WHERE m.group_id = mixologist_group_members.group_id
      AND m.user_id = auth.uid()
      AND m.role = 'admin'
    )
  )
);

-- Policy 4: Allow updating member roles if you're the creator or an admin
CREATE POLICY "Creators and admins can update members"
ON mixologist_group_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM mixologist_groups g
    WHERE g.id = mixologist_group_members.group_id 
    AND g.created_by = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM mixologist_group_members m
    WHERE m.group_id = mixologist_group_members.group_id
    AND m.user_id = auth.uid()
    AND m.role = 'admin'
  )
);