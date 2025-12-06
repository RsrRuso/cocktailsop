
-- Add RLS policy for lab_ops_payments to allow staff to insert payments
-- Join through lab_ops_orders to check outlet access
CREATE POLICY "Staff can insert payments for their outlet orders" ON public.lab_ops_payments
FOR INSERT WITH CHECK (
  order_id IN (
    SELECT lo.id FROM lab_ops_orders lo
    WHERE lo.outlet_id IN (
      SELECT id FROM lab_ops_outlets WHERE user_id = auth.uid()
    ) OR lo.outlet_id IN (
      SELECT outlet_id FROM lab_ops_staff WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

-- Also allow staff to view payments
CREATE POLICY "Staff can view payments for their outlet orders" ON public.lab_ops_payments
FOR SELECT USING (
  order_id IN (
    SELECT lo.id FROM lab_ops_orders lo
    WHERE lo.outlet_id IN (
      SELECT id FROM lab_ops_outlets WHERE user_id = auth.uid()
    ) OR lo.outlet_id IN (
      SELECT outlet_id FROM lab_ops_staff WHERE user_id = auth.uid() AND is_active = true
    )
  )
);
