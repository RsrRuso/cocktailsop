-- Fix lab_ops_tables policy with proper WITH CHECK clause
DROP POLICY IF EXISTS "Users can manage outlet tables" ON lab_ops_tables;
CREATE POLICY "Users can manage outlet tables" ON lab_ops_tables
FOR ALL USING (is_lab_ops_outlet_member(auth.uid(), outlet_id))
WITH CHECK (is_lab_ops_outlet_member(auth.uid(), outlet_id));