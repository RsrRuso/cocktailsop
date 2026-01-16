-- Fix RLS for sub-recipe loss records (batch_production_losses)
-- Existing policies only allow access via batch_productions.user_id, which blocks sub-recipe losses

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view losses from their productions" ON public.batch_production_losses;
DROP POLICY IF EXISTS "Users can insert losses for their productions" ON public.batch_production_losses;
DROP POLICY IF EXISTS "Users can update losses for their productions" ON public.batch_production_losses;
DROP POLICY IF EXISTS "Users can delete losses from their productions" ON public.batch_production_losses;

-- Recreate policies allowing BOTH batch production losses and sub-recipe production losses

CREATE POLICY "Users can view losses from their productions"
ON public.batch_production_losses
FOR SELECT
USING (
  (
    batch_production_losses.production_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.batch_productions bp
      WHERE bp.id = batch_production_losses.production_id
        AND bp.user_id = auth.uid()
    )
  )
  OR
  (
    batch_production_losses.sub_recipe_production_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.sub_recipe_productions srp
      WHERE srp.id = batch_production_losses.sub_recipe_production_id
        AND srp.produced_by_user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert losses for their productions"
ON public.batch_production_losses
FOR INSERT
WITH CHECK (
  (
    (batch_production_losses.production_id IS NOT NULL OR batch_production_losses.sub_recipe_production_id IS NOT NULL)
  )
  AND
  (
    (
      batch_production_losses.production_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.batch_productions bp
        WHERE bp.id = batch_production_losses.production_id
          AND bp.user_id = auth.uid()
      )
    )
    OR
    (
      batch_production_losses.sub_recipe_production_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.sub_recipe_productions srp
        WHERE srp.id = batch_production_losses.sub_recipe_production_id
          AND srp.produced_by_user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can update losses from their productions"
ON public.batch_production_losses
FOR UPDATE
USING (
  (
    batch_production_losses.production_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.batch_productions bp
      WHERE bp.id = batch_production_losses.production_id
        AND bp.user_id = auth.uid()
    )
  )
  OR
  (
    batch_production_losses.sub_recipe_production_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.sub_recipe_productions srp
      WHERE srp.id = batch_production_losses.sub_recipe_production_id
        AND srp.produced_by_user_id = auth.uid()
    )
  )
)
WITH CHECK (
  (
    batch_production_losses.production_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.batch_productions bp
      WHERE bp.id = batch_production_losses.production_id
        AND bp.user_id = auth.uid()
    )
  )
  OR
  (
    batch_production_losses.sub_recipe_production_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.sub_recipe_productions srp
      WHERE srp.id = batch_production_losses.sub_recipe_production_id
        AND srp.produced_by_user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete losses from their productions"
ON public.batch_production_losses
FOR DELETE
USING (
  (
    batch_production_losses.production_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.batch_productions bp
      WHERE bp.id = batch_production_losses.production_id
        AND bp.user_id = auth.uid()
    )
  )
  OR
  (
    batch_production_losses.sub_recipe_production_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.sub_recipe_productions srp
      WHERE srp.id = batch_production_losses.sub_recipe_production_id
        AND srp.produced_by_user_id = auth.uid()
    )
  )
);
