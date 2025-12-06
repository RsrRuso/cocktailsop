-- Drop and recreate policies with proper WITH CHECK clauses

-- Fix lab_ops_payments policy
DROP POLICY IF EXISTS "Users can manage order payments" ON lab_ops_payments;
CREATE POLICY "Users can manage order payments" ON lab_ops_payments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM lab_ops_orders 
    WHERE lab_ops_orders.id = lab_ops_payments.order_id 
    AND is_lab_ops_outlet_member(auth.uid(), lab_ops_orders.outlet_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM lab_ops_orders 
    WHERE lab_ops_orders.id = order_id 
    AND is_lab_ops_outlet_member(auth.uid(), lab_ops_orders.outlet_id)
  )
);

-- Fix lab_ops_orders policy  
DROP POLICY IF EXISTS "Users can manage outlet orders" ON lab_ops_orders;
CREATE POLICY "Users can manage outlet orders" ON lab_ops_orders
FOR ALL USING (is_lab_ops_outlet_member(auth.uid(), outlet_id))
WITH CHECK (is_lab_ops_outlet_member(auth.uid(), outlet_id));