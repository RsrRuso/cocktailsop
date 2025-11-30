-- Enable group members to view all batch productions in their groups

-- Drop existing restrictive SELECT policy if exists
DROP POLICY IF EXISTS "Users can view their own batch productions" ON batch_productions;

-- Create new policy allowing group members to see all batches in their group
CREATE POLICY "Group members can view batch productions in their groups"
ON batch_productions
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  (group_id IS NOT NULL AND public.is_mixologist_group_member(auth.uid(), group_id))
);

-- Ensure group members can also view batch production ingredients
DROP POLICY IF EXISTS "Users can view batch production ingredients" ON batch_production_ingredients;

CREATE POLICY "Group members can view batch production ingredients"
ON batch_production_ingredients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM batch_productions bp
    WHERE bp.id = batch_production_ingredients.production_id
    AND (
      bp.user_id = auth.uid()
      OR
      (bp.group_id IS NOT NULL AND public.is_mixologist_group_member(auth.uid(), bp.group_id))
    )
  )
);