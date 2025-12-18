-- Fix the helper function to use correct column name (created_by)
CREATE OR REPLACE FUNCTION public.is_mixologist_group_owner(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mixologist_groups
    WHERE id = _group_id
      AND created_by = _user_id
  )
$$;

-- Policy: Only recipe creator OR group owner can update
CREATE POLICY "Creator or group owner can update recipes"
ON public.batch_recipes
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR (group_id IS NOT NULL AND is_mixologist_group_owner(auth.uid(), group_id))
);

-- Policy: Only recipe creator OR group owner can delete
CREATE POLICY "Creator or group owner can delete recipes"
ON public.batch_recipes
FOR DELETE
USING (
  auth.uid() = user_id 
  OR (group_id IS NOT NULL AND is_mixologist_group_owner(auth.uid(), group_id))
);