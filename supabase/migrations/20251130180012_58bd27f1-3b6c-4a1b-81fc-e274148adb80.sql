-- Update RLS policy to show all batch productions from group members
-- regardless of group_id value

DROP POLICY IF EXISTS "Group members can view batch productions in their groups" ON batch_productions;

CREATE POLICY "Group members can view all team batch productions"
ON batch_productions
FOR SELECT
TO authenticated
USING (
  -- User can see their own productions
  user_id = auth.uid()
  OR
  -- User can see productions explicitly in their groups
  (group_id IS NOT NULL AND public.is_mixologist_group_member(auth.uid(), group_id))
  OR
  -- User can see ALL productions from ANY member of groups they belong to
  EXISTS (
    SELECT 1
    FROM mixologist_group_members mgm1
    INNER JOIN mixologist_group_members mgm2 
      ON mgm1.group_id = mgm2.group_id
    WHERE mgm1.user_id = auth.uid()
      AND mgm2.user_id = batch_productions.user_id
  )
);