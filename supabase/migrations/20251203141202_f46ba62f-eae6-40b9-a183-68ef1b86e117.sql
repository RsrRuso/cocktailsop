-- Drop existing restrictive policies on batch_production_ingredients
DROP POLICY IF EXISTS "Users can insert their own production ingredients" ON public.batch_production_ingredients;
DROP POLICY IF EXISTS "Users can update their own production ingredients" ON public.batch_production_ingredients;
DROP POLICY IF EXISTS "Users can delete their own production ingredients" ON public.batch_production_ingredients;
DROP POLICY IF EXISTS "Users can view their own production ingredients" ON public.batch_production_ingredients;

-- Create a function to check if user can manage batch production ingredients
CREATE OR REPLACE FUNCTION public.can_manage_batch_production(production_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM batch_productions bp
    WHERE bp.id = production_id
    AND (
      -- User owns the production
      bp.user_id = auth.uid()
      OR bp.produced_by_user_id = auth.uid()
      -- OR user is admin of the group
      OR EXISTS (
        SELECT 1 FROM mixologist_group_members mgm
        WHERE mgm.group_id = bp.group_id
        AND mgm.user_id = auth.uid()
        AND mgm.role = 'admin'
      )
      -- OR user is a member of the group (for viewing)
      OR EXISTS (
        SELECT 1 FROM mixologist_group_members mgm
        WHERE mgm.group_id = bp.group_id
        AND mgm.user_id = auth.uid()
      )
    )
  );
$$;

-- Create new RLS policies for batch_production_ingredients
CREATE POLICY "Users can view production ingredients they have access to"
ON public.batch_production_ingredients
FOR SELECT
USING (public.can_manage_batch_production(production_id));

CREATE POLICY "Users can insert production ingredients they have access to"
ON public.batch_production_ingredients
FOR INSERT
WITH CHECK (public.can_manage_batch_production(production_id));

CREATE POLICY "Admins and owners can update production ingredients"
ON public.batch_production_ingredients
FOR UPDATE
USING (public.can_manage_batch_production(production_id));

CREATE POLICY "Admins and owners can delete production ingredients"
ON public.batch_production_ingredients
FOR DELETE
USING (public.can_manage_batch_production(production_id));