-- Create helper function to avoid RLS infinite recursion for mixologist group membership checks
CREATE OR REPLACE FUNCTION public.is_mixologist_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mixologist_group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
  );
$$;

-- Update policy on mixologist_groups to use helper function instead of directly querying mixologist_group_members
ALTER POLICY "Members can view their groups" ON public.mixologist_groups
USING (
  public.is_mixologist_group_member(auth.uid(), id)
);

-- Update SELECT policy on mixologist_group_members to avoid self-referential query
ALTER POLICY "Users can view members of their groups" ON public.mixologist_group_members
USING (
  EXISTS (
    SELECT 1
    FROM public.mixologist_groups g
    WHERE g.id = mixologist_group_members.group_id
      AND g.created_by = auth.uid()
  )
  OR public.is_mixologist_group_member(auth.uid(), mixologist_group_members.group_id)
);
