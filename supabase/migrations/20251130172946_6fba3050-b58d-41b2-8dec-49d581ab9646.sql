-- Enable RLS on mixologist_group_members
ALTER TABLE mixologist_group_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Group members can view members in their groups" ON mixologist_group_members;
DROP POLICY IF EXISTS "Group creators can add members" ON mixologist_group_members;
DROP POLICY IF EXISTS "Group creators can remove members" ON mixologist_group_members;
DROP POLICY IF EXISTS "Members can view their own membership" ON mixologist_group_members;

-- Group members can view all members in groups they belong to
CREATE POLICY "Group members can view members in their groups"
ON mixologist_group_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM mixologist_group_members mgm
    WHERE mgm.group_id = mixologist_group_members.group_id
    AND mgm.user_id = auth.uid()
  )
);

-- Group creators can add members
CREATE POLICY "Group creators can add members"
ON mixologist_group_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM mixologist_groups mg
    WHERE mg.id = group_id
    AND mg.created_by = auth.uid()
  )
);

-- Group creators can remove members
CREATE POLICY "Group creators can remove members"
ON mixologist_group_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM mixologist_groups mg
    WHERE mg.id = group_id
    AND mg.created_by = auth.uid()
  )
);