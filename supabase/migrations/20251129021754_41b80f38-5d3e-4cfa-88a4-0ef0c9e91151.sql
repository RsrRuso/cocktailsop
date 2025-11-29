-- Fix infinite recursion in mixologist_group_members RLS policies
-- Remove recursive policies that referenced is_mixologist_group_member / same table
DROP POLICY IF EXISTS "Users can view group members" ON public.mixologist_group_members;
DROP POLICY IF EXISTS "Creators and admins can add members" ON public.mixologist_group_members;
DROP POLICY IF EXISTS "Creators and admins can remove members" ON public.mixologist_group_members;
DROP POLICY IF EXISTS "Creators and admins can update members" ON public.mixologist_group_members;

-- Safer, non-recursive policies using only mixologist_groups for permission checks

-- 1) Group creators can view all members of their groups
CREATE POLICY "Group creators can view all members"
ON public.mixologist_group_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.mixologist_groups g
    WHERE g.id = mixologist_group_members.group_id
      AND g.created_by = auth.uid()
  )
);

-- 2) Individual members can view their own membership row
CREATE POLICY "Members can view their own membership"
ON public.mixologist_group_members
FOR SELECT
USING (
  mixologist_group_members.user_id = auth.uid()
);

-- 3) Group creators can add members to their groups
CREATE POLICY "Group creators can add members"
ON public.mixologist_group_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mixologist_groups g
    WHERE g.id = mixologist_group_members.group_id
      AND g.created_by = auth.uid()
  )
);

-- 4) Group creators can update member roles / records
CREATE POLICY "Group creators can update members"
ON public.mixologist_group_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.mixologist_groups g
    WHERE g.id = mixologist_group_members.group_id
      AND g.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mixologist_groups g
    WHERE g.id = mixologist_group_members.group_id
      AND g.created_by = auth.uid()
  )
);

-- 5) Group creators can remove members
CREATE POLICY "Group creators can remove members"
ON public.mixologist_group_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.mixologist_groups g
    WHERE g.id = mixologist_group_members.group_id
      AND g.created_by = auth.uid()
  )
);
