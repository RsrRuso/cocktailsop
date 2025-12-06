
-- =====================================================
-- LAB OPS MASTER ANALYTICS TABLES
-- Comprehensive data model for restaurant/bar analytics
-- =====================================================

-- 1. Master Tables

-- 1.1 Menu Items Master (Enhanced for analytics)
ALTER TABLE lab_ops_menu_items ADD COLUMN IF NOT EXISTS item_type text DEFAULT 'food';
ALTER TABLE lab_ops_menu_items ADD COLUMN IF NOT EXISTS sub_category text;
ALTER TABLE lab_ops_menu_items ADD COLUMN IF NOT EXISTS is_bar_item boolean DEFAULT false;
ALTER TABLE lab_ops_menu_items ADD COLUMN IF NOT EXISTS is_package boolean DEFAULT false;
ALTER TABLE lab_ops_menu_items ADD COLUMN IF NOT EXISTS default_serving_ml numeric;
ALTER TABLE lab_ops_menu_items ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 0;

-- 1.2 Ingredients Master
CREATE TABLE IF NOT EXISTS lab_ops_ingredients_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid REFERENCES lab_ops_outlets(id) ON DELETE CASCADE,
  ingredient_id text NOT NULL,
  ingredient_name text NOT NULL,
  unit text NOT NULL DEFAULT 'bottle',
  base_unit_ml numeric,
  category text,
  sub_category text,
  standard_cost numeric DEFAULT 0,
  supplier_id uuid REFERENCES lab_ops_suppliers(id),
  is_bar_stock boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(outlet_id, ingredient_id)
);

-- 1.3 Recipe Costing (links menu items to ingredients)
CREATE TABLE IF NOT EXISTS lab_ops_recipe_costing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid REFERENCES lab_ops_outlets(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES lab_ops_menu_items(id) ON DELETE CASCADE,
  ingredient_master_id uuid REFERENCES lab_ops_ingredients_master(id) ON DELETE CASCADE,
  qty_per_serving numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'ml',
  waste_factor numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 1.4 Outlets Master Enhancement
ALTER TABLE lab_ops_outlets ADD COLUMN IF NOT EXISTS seating_capacity integer DEFAULT 0;
ALTER TABLE lab_ops_outlets ADD COLUMN IF NOT EXISTS location text;

-- 2. Transaction Tables

-- 2.1 Sales Transactions (detailed line-level data)
CREATE TABLE IF NOT EXISTS lab_ops_sales_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid REFERENCES lab_ops_outlets(id) ON DELETE CASCADE,
  txn_id text NOT NULL,
  check_id text,
  txn_datetime timestamptz NOT NULL DEFAULT now(),
  table_id uuid REFERENCES lab_ops_tables(id),
  menu_item_id uuid REFERENCES lab_ops_menu_items(id),
  qty numeric NOT NULL DEFAULT 1,
  gross_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  staff_id uuid REFERENCES lab_ops_staff(id),
  is_complimentary boolean DEFAULT false,
  package_session_id uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE(outlet_id, txn_id)
);

-- 2.2 Package Sessions (Free-flow / Special Packages)
CREATE TABLE IF NOT EXISTS lab_ops_package_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid REFERENCES lab_ops_outlets(id) ON DELETE CASCADE,
  package_name text NOT NULL,
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz,
  package_type text DEFAULT 'per_guest_unlimited',
  guest_count integer DEFAULT 1,
  package_price_per_guest numeric DEFAULT 0,
  total_package_revenue numeric DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2.3 Package Items (which items are included in packages)
CREATE TABLE IF NOT EXISTS lab_ops_package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_session_id uuid REFERENCES lab_ops_package_sessions(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES lab_ops_menu_items(id) ON DELETE CASCADE,
  max_qty_per_guest integer,
  created_at timestamptz DEFAULT now()
);

-- 2.4 Inventory Counts (Opening & Closing Stock)
CREATE TABLE IF NOT EXISTS lab_ops_inventory_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid REFERENCES lab_ops_outlets(id) ON DELETE CASCADE,
  count_id text NOT NULL,
  location text,
  count_datetime timestamptz NOT NULL DEFAULT now(),
  count_type text NOT NULL DEFAULT 'closing', -- opening, closing, intermediate
  ingredient_master_id uuid REFERENCES lab_ops_ingredients_master(id) ON DELETE CASCADE,
  qty_on_hand numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES lab_ops_staff(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(outlet_id, count_id)
);

-- 2.5 Inventory Movements (Purchases, Transfers, Wastage)
CREATE TABLE IF NOT EXISTS lab_ops_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid REFERENCES lab_ops_outlets(id) ON DELETE CASCADE,
  movement_id text NOT NULL,
  movement_datetime timestamptz NOT NULL DEFAULT now(),
  ingredient_master_id uuid REFERENCES lab_ops_ingredients_master(id) ON DELETE CASCADE,
  movement_type text NOT NULL, -- purchase, transfer_in, transfer_out, wastage, adjustment
  qty numeric NOT NULL,
  unit_cost numeric DEFAULT 0,
  supplier_id uuid REFERENCES lab_ops_suppliers(id),
  notes text,
  created_by uuid REFERENCES lab_ops_staff(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(outlet_id, movement_id)
);

-- 2.6 Staff Shifts
CREATE TABLE IF NOT EXISTS lab_ops_staff_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid REFERENCES lab_ops_outlets(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES lab_ops_staff(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  time_in time,
  time_out time,
  role_for_shift text,
  hours_worked numeric GENERATED ALWAYS AS (
    CASE WHEN time_out > time_in 
      THEN EXTRACT(EPOCH FROM (time_out - time_in)) / 3600 
      ELSE 0 
    END
  ) STORED,
  created_at timestamptz DEFAULT now()
);

-- 2.7 Guest Feedback
CREATE TABLE IF NOT EXISTS lab_ops_guest_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid REFERENCES lab_ops_outlets(id) ON DELETE CASCADE,
  feedback_date date NOT NULL DEFAULT CURRENT_DATE,
  source text DEFAULT 'internal', -- google, tripadvisor, internal
  rating_overall integer CHECK (rating_overall BETWEEN 1 AND 5),
  rating_food integer CHECK (rating_food BETWEEN 1 AND 5),
  rating_beverage integer CHECK (rating_beverage BETWEEN 1 AND 5),
  rating_service integer CHECK (rating_service BETWEEN 1 AND 5),
  rating_ambience integer CHECK (rating_ambience BETWEEN 1 AND 5),
  free_text text,
  staff_id uuid REFERENCES lab_ops_staff(id),
  created_at timestamptz DEFAULT now()
);

-- 2.8 Price Changes History
CREATE TABLE IF NOT EXISTS lab_ops_price_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid REFERENCES lab_ops_outlets(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES lab_ops_menu_items(id) ON DELETE CASCADE,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  old_price numeric NOT NULL,
  new_price numeric NOT NULL,
  reason text,
  created_by uuid REFERENCES lab_ops_staff(id),
  created_at timestamptz DEFAULT now()
);

-- 2.9 Complimentary Drinks/Items Log
CREATE TABLE IF NOT EXISTS lab_ops_complimentary_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid REFERENCES lab_ops_outlets(id) ON DELETE CASCADE,
  comp_date date NOT NULL DEFAULT CURRENT_DATE,
  menu_item_id uuid REFERENCES lab_ops_menu_items(id) ON DELETE CASCADE,
  qty numeric NOT NULL DEFAULT 1,
  reason text,
  approved_by uuid REFERENCES lab_ops_staff(id),
  check_id text,
  cost_value numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 3. Analytics Views / Materialized Data

-- 3.1 Daily Sales Summary (for quick reporting)
CREATE TABLE IF NOT EXISTS lab_ops_daily_sales_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid REFERENCES lab_ops_outlets(id) ON DELETE CASCADE,
  sales_date date NOT NULL,
  total_revenue numeric DEFAULT 0,
  total_orders integer DEFAULT 0,
  total_covers integer DEFAULT 0,
  avg_check numeric DEFAULT 0,
  food_revenue numeric DEFAULT 0,
  beverage_revenue numeric DEFAULT 0,
  package_revenue numeric DEFAULT 0,
  discount_total numeric DEFAULT 0,
  comp_total numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(outlet_id, sales_date)
);

-- 3.2 Item Performance Summary
CREATE TABLE IF NOT EXISTS lab_ops_item_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid REFERENCES lab_ops_outlets(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES lab_ops_menu_items(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  qty_sold numeric DEFAULT 0,
  revenue numeric DEFAULT 0,
  cost numeric DEFAULT 0,
  profit numeric DEFAULT 0,
  profit_margin numeric DEFAULT 0,
  popularity_rank integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE(outlet_id, menu_item_id, period_start, period_end)
);

-- 3.3 Staff Performance Summary
CREATE TABLE IF NOT EXISTS lab_ops_staff_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid REFERENCES lab_ops_outlets(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES lab_ops_staff(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  hours_worked numeric DEFAULT 0,
  revenue_generated numeric DEFAULT 0,
  orders_handled integer DEFAULT 0,
  avg_check numeric DEFAULT 0,
  tips_collected numeric DEFAULT 0,
  feedback_avg numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(outlet_id, staff_id, period_start, period_end)
);

-- 3.4 Bar Variance Report Data
CREATE TABLE IF NOT EXISTS lab_ops_bar_variance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid REFERENCES lab_ops_outlets(id) ON DELETE CASCADE,
  ingredient_master_id uuid REFERENCES lab_ops_ingredients_master(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  opening_stock numeric DEFAULT 0,
  purchases numeric DEFAULT 0,
  transfers_in numeric DEFAULT 0,
  transfers_out numeric DEFAULT 0,
  closing_stock numeric DEFAULT 0,
  theoretical_consumption numeric DEFAULT 0, -- calculated from POS sales
  actual_consumption numeric DEFAULT 0, -- opening + purchases - closing
  variance_qty numeric DEFAULT 0,
  variance_cost numeric DEFAULT 0,
  variance_percent numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(outlet_id, ingredient_master_id, period_start, period_end)
);

-- 4. Data Import Tracking
CREATE TABLE IF NOT EXISTS lab_ops_data_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid REFERENCES lab_ops_outlets(id) ON DELETE CASCADE,
  import_type text NOT NULL, -- sales, inventory, staff, feedback
  file_name text,
  records_imported integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  status text DEFAULT 'pending', -- pending, processing, completed, failed
  error_log jsonb,
  imported_by uuid,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Enable RLS on all new tables
ALTER TABLE lab_ops_ingredients_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_recipe_costing ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_package_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_guest_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_price_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_complimentary_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_daily_sales_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_item_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_staff_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_bar_variance ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_data_imports ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow access through outlet ownership
CREATE POLICY "lab_ops_ingredients_master_outlet_access" ON lab_ops_ingredients_master
  FOR ALL USING (outlet_id IN (SELECT id FROM lab_ops_outlets WHERE user_id = auth.uid()));

CREATE POLICY "lab_ops_recipe_costing_outlet_access" ON lab_ops_recipe_costing
  FOR ALL USING (outlet_id IN (SELECT id FROM lab_ops_outlets WHERE user_id = auth.uid()));

CREATE POLICY "lab_ops_sales_transactions_outlet_access" ON lab_ops_sales_transactions
  FOR ALL USING (outlet_id IN (SELECT id FROM lab_ops_outlets WHERE user_id = auth.uid()));

CREATE POLICY "lab_ops_package_sessions_outlet_access" ON lab_ops_package_sessions
  FOR ALL USING (outlet_id IN (SELECT id FROM lab_ops_outlets WHERE user_id = auth.uid()));

CREATE POLICY "lab_ops_package_items_access" ON lab_ops_package_items
  FOR ALL USING (package_session_id IN (
    SELECT id FROM lab_ops_package_sessions WHERE outlet_id IN (
      SELECT id FROM lab_ops_outlets WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "lab_ops_inventory_counts_outlet_access" ON lab_ops_inventory_counts
  FOR ALL USING (outlet_id IN (SELECT id FROM lab_ops_outlets WHERE user_id = auth.uid()));

CREATE POLICY "lab_ops_inventory_movements_outlet_access" ON lab_ops_inventory_movements
  FOR ALL USING (outlet_id IN (SELECT id FROM lab_ops_outlets WHERE user_id = auth.uid()));

CREATE POLICY "lab_ops_staff_shifts_outlet_access" ON lab_ops_staff_shifts
  FOR ALL USING (outlet_id IN (SELECT id FROM lab_ops_outlets WHERE user_id = auth.uid()));

CREATE POLICY "lab_ops_guest_feedback_outlet_access" ON lab_ops_guest_feedback
  FOR ALL USING (outlet_id IN (SELECT id FROM lab_ops_outlets WHERE user_id = auth.uid()));

CREATE POLICY "lab_ops_price_changes_outlet_access" ON lab_ops_price_changes
  FOR ALL USING (outlet_id IN (SELECT id FROM lab_ops_outlets WHERE user_id = auth.uid()));

CREATE POLICY "lab_ops_complimentary_log_outlet_access" ON lab_ops_complimentary_log
  FOR ALL USING (outlet_id IN (SELECT id FROM lab_ops_outlets WHERE user_id = auth.uid()));

CREATE POLICY "lab_ops_daily_sales_summary_outlet_access" ON lab_ops_daily_sales_summary
  FOR ALL USING (outlet_id IN (SELECT id FROM lab_ops_outlets WHERE user_id = auth.uid()));

CREATE POLICY "lab_ops_item_performance_outlet_access" ON lab_ops_item_performance
  FOR ALL USING (outlet_id IN (SELECT id FROM lab_ops_outlets WHERE user_id = auth.uid()));

CREATE POLICY "lab_ops_staff_performance_outlet_access" ON lab_ops_staff_performance
  FOR ALL USING (outlet_id IN (SELECT id FROM lab_ops_outlets WHERE user_id = auth.uid()));

CREATE POLICY "lab_ops_bar_variance_outlet_access" ON lab_ops_bar_variance
  FOR ALL USING (outlet_id IN (SELECT id FROM lab_ops_outlets WHERE user_id = auth.uid()));

CREATE POLICY "lab_ops_data_imports_outlet_access" ON lab_ops_data_imports
  FOR ALL USING (outlet_id IN (SELECT id FROM lab_ops_outlets WHERE user_id = auth.uid()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lab_ops_sales_txn_outlet_date ON lab_ops_sales_transactions(outlet_id, txn_datetime);
CREATE INDEX IF NOT EXISTS idx_lab_ops_inventory_counts_outlet ON lab_ops_inventory_counts(outlet_id, count_datetime);
CREATE INDEX IF NOT EXISTS idx_lab_ops_inventory_movements_outlet ON lab_ops_inventory_movements(outlet_id, movement_datetime);
CREATE INDEX IF NOT EXISTS idx_lab_ops_staff_shifts_outlet_date ON lab_ops_staff_shifts(outlet_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_lab_ops_daily_sales_outlet_date ON lab_ops_daily_sales_summary(outlet_id, sales_date);
