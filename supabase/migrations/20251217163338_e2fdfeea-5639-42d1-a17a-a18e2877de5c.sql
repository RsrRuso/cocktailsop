-- Fix RLS policy for recording POS sales (was comparing s.outlet_id to itself)

-- Ensure RLS is enabled
ALTER TABLE public.lab_ops_sales ENABLE ROW LEVEL SECURITY;

-- Recreate policy with correct outlet match
DROP POLICY IF EXISTS "Staff can insert sales by staff id" ON public.lab_ops_sales;

CREATE POLICY "Staff can insert sales by staff id"
ON public.lab_ops_sales
FOR INSERT
TO public
WITH CHECK (
  sold_by IS NOT NULL
  AND outlet_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.lab_ops_staff s
    WHERE s.id = lab_ops_sales.sold_by
      AND s.outlet_id = lab_ops_sales.outlet_id
      AND s.is_active = true
  )
);

-- Ensure API roles have privileges (safe if already granted)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_ops_sales TO anon, authenticated;