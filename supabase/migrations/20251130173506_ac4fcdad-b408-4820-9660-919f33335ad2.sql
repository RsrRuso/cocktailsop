-- Fix infinite recursion in mixologist_group_members policy by using helper function

-- Drop the recursive SELECT policy
DROP POLICY IF EXISTS "Group members can view members in their groups" ON mixologist_group_members;

-- Recreate SELECT policy using security definer helper to avoid recursion
CREATE POLICY "Group members can view members in their groups"
ON mixologist_group_members
FOR SELECT
TO authenticated
USING (
  public.is_mixologist_group_member(auth.uid(), group_id)
);