-- Enable collaborative editing/deletion of batch productions within mixologist groups

-- 1) Allow group members to update batch_productions rows in their groups
DROP POLICY IF EXISTS "Users can update their own productions" ON public.batch_productions;

CREATE POLICY "Group members can update batch productions"
ON public.batch_productions
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR (group_id IS NOT NULL AND public.is_mixologist_group_member(auth.uid(), group_id))
)
WITH CHECK (
  user_id = auth.uid()
  OR (group_id IS NOT NULL AND public.is_mixologist_group_member(auth.uid(), group_id))
);

-- 2) Allow group members to delete batch_productions rows in their groups
CREATE POLICY "Group members can delete batch productions"
ON public.batch_productions
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR (group_id IS NOT NULL AND public.is_mixologist_group_member(auth.uid(), group_id))
);

-- 3) Allow group members to insert ingredients for any accessible production
DROP POLICY IF EXISTS "Users can create production ingredients" ON public.batch_production_ingredients;

CREATE POLICY "Group members can create production ingredients"
ON public.batch_production_ingredients
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.batch_productions bp
    WHERE bp.id = batch_production_ingredients.production_id
      AND (
        bp.user_id = auth.uid()
        OR (bp.group_id IS NOT NULL AND public.is_mixologist_group_member(auth.uid(), bp.group_id))
      )
  )
);

-- 4) Allow group members to delete ingredients for productions in their groups
CREATE POLICY "Group members can delete production ingredients"
ON public.batch_production_ingredients
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.batch_productions bp
    WHERE bp.id = batch_production_ingredients.production_id
      AND (
        bp.user_id = auth.uid()
        OR (bp.group_id IS NOT NULL AND public.is_mixologist_group_member(auth.uid(), bp.group_id))
      )
  )
);