-- 1) Expand allowed loss reasons to include 'production_loss'
ALTER TABLE public.batch_production_losses
  DROP CONSTRAINT IF EXISTS batch_production_losses_loss_reason_check;

ALTER TABLE public.batch_production_losses
  ADD CONSTRAINT batch_production_losses_loss_reason_check
  CHECK (
    loss_reason = ANY (
      ARRAY[
        'spillage'::text,
        'evaporation'::text,
        'measurement_error'::text,
        'equipment_residue'::text,
        'quality_issue'::text,
        'overpouring'::text,
        'training'::text,
        'production_loss'::text,
        'other'::text
      ]
    )
  );

-- 2) Backfill missing sub-recipe production losses (proportional by ingredient)
WITH prod AS (
  SELECT
    srp.id AS sub_recipe_production_id,
    srp.quantity_produced_ml::numeric AS actual_total_ml,
    srp.produced_by_user_id,
    srp.produced_by_name,
    sr.name AS sub_recipe_name,
    sr.ingredients AS ingredients_json,
    (
      SELECT SUM((i->>'amount')::numeric)
      FROM jsonb_array_elements(sr.ingredients) i
      WHERE (i ? 'amount')
    ) AS expected_total_ml
  FROM public.sub_recipe_productions srp
  JOIN public.sub_recipes sr ON sr.id = srp.sub_recipe_id
),
eligible AS (
  SELECT *
  FROM prod p
  WHERE p.expected_total_ml IS NOT NULL
    AND p.actual_total_ml IS NOT NULL
    AND p.expected_total_ml > p.actual_total_ml
    AND NOT EXISTS (
      SELECT 1
      FROM public.batch_production_losses bpl
      WHERE bpl.sub_recipe_production_id = p.sub_recipe_production_id
    )
)
INSERT INTO public.batch_production_losses (
  production_id,
  sub_recipe_production_id,
  ingredient_name,
  sub_recipe_name,
  loss_amount_ml,
  loss_reason,
  notes,
  expected_yield_ml,
  actual_yield_ml,
  recorded_by_user_id,
  recorded_by_name
)
SELECT
  NULL::uuid AS production_id,
  e.sub_recipe_production_id,
  (i->>'name')::text AS ingredient_name,
  e.sub_recipe_name,
  ROUND(
    (e.expected_total_ml - e.actual_total_ml)
    * (((i->>'amount')::numeric) / NULLIF(e.expected_total_ml, 0)),
    2
  ) AS loss_amount_ml,
  'production_loss'::text AS loss_reason,
  (
    'Backfilled from production yield discrepancy (expected '
    || e.expected_total_ml::text
    || 'ml, actual '
    || e.actual_total_ml::text
    || 'ml).'
  ) AS notes,
  (i->>'amount')::numeric AS expected_yield_ml,
  ROUND(
    (i->>'amount')::numeric
    - (
      (e.expected_total_ml - e.actual_total_ml)
      * (((i->>'amount')::numeric) / NULLIF(e.expected_total_ml, 0))
    ),
    2
  ) AS actual_yield_ml,
  e.produced_by_user_id,
  e.produced_by_name
FROM eligible e
CROSS JOIN LATERAL jsonb_array_elements(e.ingredients_json) i
WHERE (i ? 'name')
  AND (i ? 'amount')
  AND COALESCE((i->>'amount')::numeric, 0) > 0;