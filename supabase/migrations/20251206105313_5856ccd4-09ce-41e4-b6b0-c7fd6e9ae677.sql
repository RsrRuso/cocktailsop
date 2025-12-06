-- Drop existing overlapping policies on lab_ops_payments
DROP POLICY IF EXISTS "Staff can insert payments for their outlet orders" ON public.lab_ops_payments;
DROP POLICY IF EXISTS "Staff can view payments for their outlet orders" ON public.lab_ops_payments;
DROP POLICY IF EXISTS "Users can manage order payments" ON public.lab_ops_payments;
DROP POLICY IF EXISTS "Users can view order payments" ON public.lab_ops_payments;

-- Create a single comprehensive policy for all operations using security definer function
CREATE POLICY "Staff can manage payments for their outlet" ON public.lab_ops_payments
FOR ALL USING (
  public.is_lab_ops_outlet_member(auth.uid(), (
    SELECT outlet_id FROM lab_ops_orders WHERE id = order_id
  ))
) WITH CHECK (
  public.is_lab_ops_outlet_member(auth.uid(), (
    SELECT outlet_id FROM lab_ops_orders WHERE id = order_id
  ))
);