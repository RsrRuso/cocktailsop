-- Add public access policies for StaffPOS (PIN-based auth, no Supabase user)

-- Tables - allow public read/update for POS
CREATE POLICY "Public read tables for POS"
ON lab_ops_tables FOR SELECT
USING (true);

CREATE POLICY "Public update tables for POS"
ON lab_ops_tables FOR UPDATE
USING (true);

-- Categories - allow public read
CREATE POLICY "Public read categories for POS"
ON lab_ops_categories FOR SELECT
USING (true);

-- Menu items - allow public read
CREATE POLICY "Public read menu items for POS"
ON lab_ops_menu_items FOR SELECT
USING (true);

-- Outlets - allow public read
CREATE POLICY "Public read outlets for POS"
ON lab_ops_outlets FOR SELECT
USING (true);

-- Orders - allow public CRUD for POS
CREATE POLICY "Public read orders for POS"
ON lab_ops_orders FOR SELECT
USING (true);

CREATE POLICY "Public insert orders for POS"
ON lab_ops_orders FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public update orders for POS"
ON lab_ops_orders FOR UPDATE
USING (true);

-- Order items - allow public CRUD for POS
CREATE POLICY "Public read order items for POS"
ON lab_ops_order_items FOR SELECT
USING (true);

CREATE POLICY "Public insert order items for POS"
ON lab_ops_order_items FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public update order items for POS"
ON lab_ops_order_items FOR UPDATE
USING (true);