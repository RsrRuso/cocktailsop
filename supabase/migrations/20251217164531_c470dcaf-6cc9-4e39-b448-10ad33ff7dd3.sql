-- Fix sales inserts + serving size once-and-forever

-- 1) Fix wrong foreign key (was pointing to auth users). Use staff table instead.
ALTER TABLE public.lab_ops_sales
  DROP CONSTRAINT IF EXISTS lab_ops_sales_sold_by_fkey;

ALTER TABLE public.lab_ops_sales
  ADD CONSTRAINT lab_ops_sales_sold_by_staff_fkey
  FOREIGN KEY (sold_by)
  REFERENCES public.lab_ops_staff(id)
  ON DELETE SET NULL;

-- 2) Tighten/repair insert policy so ONLY authenticated users can insert sales for their own staff record
DROP POLICY IF EXISTS "Staff can insert sales by staff id" ON public.lab_ops_sales;

CREATE POLICY "Staff can insert sales (authenticated staff)"
ON public.lab_ops_sales
FOR INSERT
TO authenticated
WITH CHECK (
  sold_by IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.lab_ops_staff s
    WHERE s.id = lab_ops_sales.sold_by
      AND s.outlet_id = lab_ops_sales.outlet_id
      AND COALESCE(s.is_active, true) = true
      AND s.user_id = auth.uid()
  )
);

-- 3) Repair existing serving_ml values for synced batch menu items (fixes string-concatenation bug)
WITH calc AS (
  SELECT
    br.id AS batch_recipe_id,
    COALESCE(
      SUM(
        CASE
          WHEN lower(coalesce(elem->>'unit','')) = 'ml' THEN
            COALESCE(
              NULLIF(regexp_replace(coalesce(elem->>'amount',''), '[^0-9\\.]', '', 'g'), '')::numeric,
              0
            )
          ELSE 0
        END
      ),
      0
    ) AS total_ml,
    GREATEST(COALESCE(br.current_serves, 1), 1) AS serves
  FROM public.batch_recipes br
  LEFT JOIN LATERAL jsonb_array_elements(COALESCE(br.ingredients::jsonb, '[]'::jsonb)) AS elem ON true
  GROUP BY br.id, br.current_serves
)
UPDATE public.lab_ops_menu_items mi
SET
  serving_ml = CASE
    WHEN calc.total_ml > 0 THEN ROUND(calc.total_ml / calc.serves)
    ELSE mi.serving_ml
  END,
  updated_at = now()
FROM calc
WHERE mi.batch_recipe_id = calc.batch_recipe_id
  AND mi.batch_recipe_id IS NOT NULL;