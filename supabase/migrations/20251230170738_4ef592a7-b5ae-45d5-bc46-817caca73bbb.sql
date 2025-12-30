-- Create a comprehensive function to check if user can manage group recipes
-- This includes: group creator (owner), group admins, or if user_id = auth.uid()
CREATE OR REPLACE FUNCTION public.can_manage_batch_recipe(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Check if user is the group creator/owner
    EXISTS (
      SELECT 1
      FROM public.mixologist_groups
      WHERE id = _group_id
        AND created_by = _user_id
    )
    OR
    -- Check if user is an admin in the group
    EXISTS (
      SELECT 1
      FROM public.mixologist_group_members
      WHERE group_id = _group_id
        AND user_id = _user_id
        AND role = 'admin'
        AND is_active = true
    )
$$;

-- Drop existing conflicting policies on batch_recipes
DROP POLICY IF EXISTS "Creator or group owner can update recipes" ON public.batch_recipes;
DROP POLICY IF EXISTS "Users can update their own recipes" ON public.batch_recipes;
DROP POLICY IF EXISTS "Creator or group owner can delete recipes" ON public.batch_recipes;
DROP POLICY IF EXISTS "Users can delete their own recipes" ON public.batch_recipes;

-- Create new unified update policy
-- Recipe creator OR group owner/admin can update
CREATE POLICY "Recipe owner or group admin can update" 
ON public.batch_recipes 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR (group_id IS NOT NULL AND can_manage_batch_recipe(auth.uid(), group_id))
);

-- Create new unified delete policy  
-- Recipe creator OR group owner/admin can delete
CREATE POLICY "Recipe owner or group admin can delete" 
ON public.batch_recipes 
FOR DELETE 
USING (
  auth.uid() = user_id 
  OR (group_id IS NOT NULL AND can_manage_batch_recipe(auth.uid(), group_id))
);