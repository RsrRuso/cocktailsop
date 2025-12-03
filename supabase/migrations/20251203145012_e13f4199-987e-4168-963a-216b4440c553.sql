-- Drop conflicting/duplicate RLS policies on batch_production_ingredients
DROP POLICY IF EXISTS "Users can view production ingredients they have access to" ON batch_production_ingredients;
DROP POLICY IF EXISTS "Users can view ingredients of accessible productions" ON batch_production_ingredients;
DROP POLICY IF EXISTS "Group members can view batch production ingredients" ON batch_production_ingredients;

-- Create single, clear SELECT policy for batch_production_ingredients
CREATE POLICY "View ingredients of accessible batch productions"
ON batch_production_ingredients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM batch_productions bp
    WHERE bp.id = batch_production_ingredients.production_id
    AND (
      bp.user_id = auth.uid()
      OR (bp.group_id IS NOT NULL AND is_mixologist_group_member(auth.uid(), bp.group_id))
    )
  )
);