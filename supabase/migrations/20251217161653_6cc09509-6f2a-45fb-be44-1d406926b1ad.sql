-- Allow PIN-based staff (unauthenticated) to record sales 
-- (fixes batch deduction – relies on lab_ops_sales existing)

CREATE POLICY "Staff can insert sales by staff id"
ON public.lab_ops_sales
FOR INSERT
TO public
WITH CHECK (
  sold_by IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.lab_ops_staff s
    WHERE s.id = sold_by
      AND s.outlet_id = outlet_id
      AND s.is_active = true
  )
);