
-- LAB Ops: Restaurant & Bar Master System Database Schema

-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE lab_ops_role AS ENUM ('waiter', 'bartender', 'kitchen', 'supervisor', 'manager', 'admin');
CREATE TYPE lab_ops_order_status AS ENUM ('open', 'sent', 'in_progress', 'ready', 'closed', 'cancelled');
CREATE TYPE lab_ops_order_item_status AS ENUM ('pending', 'sent', 'in_progress', 'ready', 'served', 'voided');
CREATE TYPE lab_ops_table_status AS ENUM ('free', 'seated', 'ordering', 'bill_requested', 'closed');
CREATE TYPE lab_ops_po_status AS ENUM ('draft', 'issued', 'partially_received', 'closed', 'cancelled');
CREATE TYPE lab_ops_movement_type AS ENUM ('purchase', 'sale', 'wastage', 'breakage', 'transfer', 'adjustment');

-- =============================================
-- OUTLETS & ORGANIZATION
-- =============================================
CREATE TABLE lab_ops_outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  type TEXT DEFAULT 'restaurant',
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lab_ops_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES lab_ops_outlets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'service', -- service, storage, bar, kitchen
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lab_ops_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES lab_ops_outlets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 4,
  status lab_ops_table_status DEFAULT 'free',
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lab_ops_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES lab_ops_outlets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- BAR, HOT_KITCHEN, COLD_KITCHEN, PASTRY, EXPO
  printer_config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- STAFF & PERMISSIONS
-- =============================================
CREATE TABLE lab_ops_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  outlet_id UUID REFERENCES lab_ops_outlets(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  pin_code TEXT,
  role lab_ops_role DEFAULT 'waiter',
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- MENU & CATEGORIES
-- =============================================
CREATE TABLE lab_ops_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES lab_ops_outlets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES lab_ops_categories(id),
  type TEXT DEFAULT 'food', -- food, drink
  sort_order INTEGER DEFAULT 0,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lab_ops_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES lab_ops_outlets(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES lab_ops_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC(10,2) NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_recipe_based BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lab_ops_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES lab_ops_outlets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'optional', -- required, optional
  price_delta NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lab_ops_menu_item_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES lab_ops_menu_items(id) ON DELETE CASCADE NOT NULL,
  modifier_id UUID REFERENCES lab_ops_modifiers(id) ON DELETE CASCADE NOT NULL,
  is_required BOOLEAN DEFAULT false
);

CREATE TABLE lab_ops_menu_item_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES lab_ops_menu_items(id) ON DELETE CASCADE NOT NULL,
  station_id UUID REFERENCES lab_ops_stations(id) ON DELETE CASCADE NOT NULL,
  priority INTEGER DEFAULT 1
);

-- =============================================
-- ORDERS & PAYMENTS
-- =============================================
CREATE TABLE lab_ops_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES lab_ops_outlets(id) ON DELETE CASCADE NOT NULL,
  table_id UUID REFERENCES lab_ops_tables(id),
  server_id UUID REFERENCES lab_ops_staff(id),
  status lab_ops_order_status DEFAULT 'open',
  covers INTEGER DEFAULT 1,
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  subtotal NUMERIC(10,2) DEFAULT 0,
  discount_total NUMERIC(10,2) DEFAULT 0,
  tax_total NUMERIC(10,2) DEFAULT 0,
  service_charge NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lab_ops_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES lab_ops_orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES lab_ops_menu_items(id) NOT NULL,
  station_id UUID REFERENCES lab_ops_stations(id),
  qty INTEGER DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  status lab_ops_order_item_status DEFAULT 'pending',
  course INTEGER DEFAULT 1,
  note TEXT,
  modifiers JSONB DEFAULT '[]',
  sent_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lab_ops_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES lab_ops_orders(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL, -- cash, card, room_charge, voucher
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lab_ops_void_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES lab_ops_outlets(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,
  description TEXT
);

CREATE TABLE lab_ops_voids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID REFERENCES lab_ops_order_items(id) ON DELETE CASCADE NOT NULL,
  staff_id UUID REFERENCES lab_ops_staff(id),
  reason_id UUID REFERENCES lab_ops_void_reasons(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INVENTORY & STOCK
-- =============================================
CREATE TABLE lab_ops_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES lab_ops_outlets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  base_unit TEXT DEFAULT 'piece', -- ml, L, g, kg, piece
  par_level NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lab_ops_stock_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID REFERENCES lab_ops_inventory_items(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES lab_ops_locations(id) ON DELETE CASCADE NOT NULL,
  quantity NUMERIC(10,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(inventory_item_id, location_id)
);

CREATE TABLE lab_ops_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID REFERENCES lab_ops_inventory_items(id) ON DELETE CASCADE NOT NULL,
  from_location_id UUID REFERENCES lab_ops_locations(id),
  to_location_id UUID REFERENCES lab_ops_locations(id),
  qty NUMERIC(10,2) NOT NULL,
  movement_type lab_ops_movement_type NOT NULL,
  reference_type TEXT, -- order, po, grn, stock_take
  reference_id UUID,
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- SUPPLIERS & PURCHASING
-- =============================================
CREATE TABLE lab_ops_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES lab_ops_outlets(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  payment_terms TEXT,
  lead_time_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lab_ops_inventory_item_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID REFERENCES lab_ops_inventory_items(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES lab_ops_suppliers(id),
  unit_cost NUMERIC(10,2) NOT NULL,
  effective_from TIMESTAMPTZ DEFAULT now(),
  effective_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lab_ops_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES lab_ops_outlets(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES lab_ops_suppliers(id) NOT NULL,
  status lab_ops_po_status DEFAULT 'draft',
  po_number TEXT,
  po_date DATE DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  total_amount NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lab_ops_purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES lab_ops_purchase_orders(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES lab_ops_inventory_items(id) NOT NULL,
  qty_ordered NUMERIC(10,2) NOT NULL,
  unit_cost NUMERIC(10,2) NOT NULL,
  qty_received NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lab_ops_goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES lab_ops_purchase_orders(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES lab_ops_locations(id),
  received_date TIMESTAMPTZ DEFAULT now(),
  received_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lab_ops_goods_receipt_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id UUID REFERENCES lab_ops_goods_receipts(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES lab_ops_inventory_items(id) NOT NULL,
  qty_received NUMERIC(10,2) NOT NULL,
  final_unit_cost NUMERIC(10,2),
  batch_no TEXT,
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- STOCK TAKES
-- =============================================
CREATE TABLE lab_ops_stock_takes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES lab_ops_outlets(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES lab_ops_locations(id),
  status TEXT DEFAULT 'in_progress', -- in_progress, completed, cancelled
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lab_ops_stock_take_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_take_id UUID REFERENCES lab_ops_stock_takes(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES lab_ops_inventory_items(id) NOT NULL,
  system_qty NUMERIC(10,2) DEFAULT 0,
  counted_qty NUMERIC(10,2),
  variance_qty NUMERIC(10,2) GENERATED ALWAYS AS (COALESCE(counted_qty, 0) - system_qty) STORED,
  variance_cost NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RECIPES & COSTING
-- =============================================
CREATE TABLE lab_ops_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES lab_ops_menu_items(id) ON DELETE CASCADE NOT NULL,
  yield_qty NUMERIC(10,2) DEFAULT 1,
  yield_unit TEXT DEFAULT 'portion',
  version_number INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lab_ops_recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES lab_ops_recipes(id) ON DELETE CASCADE NOT NULL,
  inventory_item_id UUID REFERENCES lab_ops_inventory_items(id) NOT NULL,
  qty NUMERIC(10,4) NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- AUDIT LOG
-- =============================================
CREATE TABLE lab_ops_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  outlet_id UUID REFERENCES lab_ops_outlets(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_lab_ops_orders_outlet ON lab_ops_orders(outlet_id);
CREATE INDEX idx_lab_ops_orders_table ON lab_ops_orders(table_id);
CREATE INDEX idx_lab_ops_orders_status ON lab_ops_orders(status);
CREATE INDEX idx_lab_ops_order_items_order ON lab_ops_order_items(order_id);
CREATE INDEX idx_lab_ops_order_items_station ON lab_ops_order_items(station_id);
CREATE INDEX idx_lab_ops_order_items_status ON lab_ops_order_items(status);
CREATE INDEX idx_lab_ops_stock_movements_item ON lab_ops_stock_movements(inventory_item_id);
CREATE INDEX idx_lab_ops_audit_logs_outlet ON lab_ops_audit_logs(outlet_id);

-- =============================================
-- ENABLE RLS
-- =============================================
ALTER TABLE lab_ops_outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_menu_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_menu_item_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_void_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_voids ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_inventory_item_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_goods_receipt_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_stock_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_stock_take_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ops_audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - Outlet-based access
-- =============================================

-- Helper function to check outlet access
CREATE OR REPLACE FUNCTION is_lab_ops_outlet_member(_user_id UUID, _outlet_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lab_ops_outlets WHERE id = _outlet_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM lab_ops_staff WHERE outlet_id = _outlet_id AND user_id = _user_id AND is_active = true
  )
$$;

-- Outlets
CREATE POLICY "Users can view own outlets" ON lab_ops_outlets FOR SELECT USING (user_id = auth.uid() OR is_lab_ops_outlet_member(auth.uid(), id));
CREATE POLICY "Users can create outlets" ON lab_ops_outlets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners can update outlets" ON lab_ops_outlets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owners can delete outlets" ON lab_ops_outlets FOR DELETE USING (user_id = auth.uid());

-- Locations
CREATE POLICY "Users can view outlet locations" ON lab_ops_locations FOR SELECT USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));
CREATE POLICY "Users can manage outlet locations" ON lab_ops_locations FOR ALL USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

-- Tables
CREATE POLICY "Users can view outlet tables" ON lab_ops_tables FOR SELECT USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));
CREATE POLICY "Users can manage outlet tables" ON lab_ops_tables FOR ALL USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

-- Stations
CREATE POLICY "Users can view outlet stations" ON lab_ops_stations FOR SELECT USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));
CREATE POLICY "Users can manage outlet stations" ON lab_ops_stations FOR ALL USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

-- Staff
CREATE POLICY "Users can view outlet staff" ON lab_ops_staff FOR SELECT USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));
CREATE POLICY "Owners can manage staff" ON lab_ops_staff FOR ALL USING (EXISTS (SELECT 1 FROM lab_ops_outlets WHERE id = outlet_id AND user_id = auth.uid()));

-- Categories
CREATE POLICY "Users can view outlet categories" ON lab_ops_categories FOR SELECT USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));
CREATE POLICY "Users can manage outlet categories" ON lab_ops_categories FOR ALL USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

-- Menu Items
CREATE POLICY "Users can view outlet menu items" ON lab_ops_menu_items FOR SELECT USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));
CREATE POLICY "Users can manage outlet menu items" ON lab_ops_menu_items FOR ALL USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

-- Modifiers
CREATE POLICY "Users can view outlet modifiers" ON lab_ops_modifiers FOR SELECT USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));
CREATE POLICY "Users can manage outlet modifiers" ON lab_ops_modifiers FOR ALL USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

-- Menu Item Modifiers
CREATE POLICY "Users can view menu item modifiers" ON lab_ops_menu_item_modifiers FOR SELECT USING (EXISTS (SELECT 1 FROM lab_ops_menu_items WHERE id = menu_item_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));
CREATE POLICY "Users can manage menu item modifiers" ON lab_ops_menu_item_modifiers FOR ALL USING (EXISTS (SELECT 1 FROM lab_ops_menu_items WHERE id = menu_item_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));

-- Menu Item Stations
CREATE POLICY "Users can view menu item stations" ON lab_ops_menu_item_stations FOR SELECT USING (EXISTS (SELECT 1 FROM lab_ops_menu_items WHERE id = menu_item_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));
CREATE POLICY "Users can manage menu item stations" ON lab_ops_menu_item_stations FOR ALL USING (EXISTS (SELECT 1 FROM lab_ops_menu_items WHERE id = menu_item_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));

-- Orders
CREATE POLICY "Users can view outlet orders" ON lab_ops_orders FOR SELECT USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));
CREATE POLICY "Users can manage outlet orders" ON lab_ops_orders FOR ALL USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

-- Order Items
CREATE POLICY "Users can view order items" ON lab_ops_order_items FOR SELECT USING (EXISTS (SELECT 1 FROM lab_ops_orders WHERE id = order_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));
CREATE POLICY "Users can manage order items" ON lab_ops_order_items FOR ALL USING (EXISTS (SELECT 1 FROM lab_ops_orders WHERE id = order_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));

-- Payments
CREATE POLICY "Users can view order payments" ON lab_ops_payments FOR SELECT USING (EXISTS (SELECT 1 FROM lab_ops_orders WHERE id = order_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));
CREATE POLICY "Users can manage order payments" ON lab_ops_payments FOR ALL USING (EXISTS (SELECT 1 FROM lab_ops_orders WHERE id = order_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));

-- Void Reasons
CREATE POLICY "Users can view outlet void reasons" ON lab_ops_void_reasons FOR SELECT USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));
CREATE POLICY "Users can manage outlet void reasons" ON lab_ops_void_reasons FOR ALL USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

-- Voids
CREATE POLICY "Users can view voids" ON lab_ops_voids FOR SELECT USING (EXISTS (SELECT 1 FROM lab_ops_order_items oi JOIN lab_ops_orders o ON oi.order_id = o.id WHERE oi.id = order_item_id AND is_lab_ops_outlet_member(auth.uid(), o.outlet_id)));
CREATE POLICY "Users can manage voids" ON lab_ops_voids FOR ALL USING (EXISTS (SELECT 1 FROM lab_ops_order_items oi JOIN lab_ops_orders o ON oi.order_id = o.id WHERE oi.id = order_item_id AND is_lab_ops_outlet_member(auth.uid(), o.outlet_id)));

-- Inventory Items
CREATE POLICY "Users can view outlet inventory items" ON lab_ops_inventory_items FOR SELECT USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));
CREATE POLICY "Users can manage outlet inventory items" ON lab_ops_inventory_items FOR ALL USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

-- Stock Levels
CREATE POLICY "Users can view stock levels" ON lab_ops_stock_levels FOR SELECT USING (EXISTS (SELECT 1 FROM lab_ops_inventory_items WHERE id = inventory_item_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));
CREATE POLICY "Users can manage stock levels" ON lab_ops_stock_levels FOR ALL USING (EXISTS (SELECT 1 FROM lab_ops_inventory_items WHERE id = inventory_item_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));

-- Stock Movements
CREATE POLICY "Users can view stock movements" ON lab_ops_stock_movements FOR SELECT USING (EXISTS (SELECT 1 FROM lab_ops_inventory_items WHERE id = inventory_item_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));
CREATE POLICY "Users can manage stock movements" ON lab_ops_stock_movements FOR ALL USING (EXISTS (SELECT 1 FROM lab_ops_inventory_items WHERE id = inventory_item_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));

-- Suppliers
CREATE POLICY "Users can view outlet suppliers" ON lab_ops_suppliers FOR SELECT USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));
CREATE POLICY "Users can manage outlet suppliers" ON lab_ops_suppliers FOR ALL USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

-- Inventory Item Costs
CREATE POLICY "Users can view inventory costs" ON lab_ops_inventory_item_costs FOR SELECT USING (EXISTS (SELECT 1 FROM lab_ops_inventory_items WHERE id = inventory_item_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));
CREATE POLICY "Users can manage inventory costs" ON lab_ops_inventory_item_costs FOR ALL USING (EXISTS (SELECT 1 FROM lab_ops_inventory_items WHERE id = inventory_item_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));

-- Purchase Orders
CREATE POLICY "Users can view outlet POs" ON lab_ops_purchase_orders FOR SELECT USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));
CREATE POLICY "Users can manage outlet POs" ON lab_ops_purchase_orders FOR ALL USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

-- PO Lines
CREATE POLICY "Users can view PO lines" ON lab_ops_purchase_order_lines FOR SELECT USING (EXISTS (SELECT 1 FROM lab_ops_purchase_orders WHERE id = purchase_order_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));
CREATE POLICY "Users can manage PO lines" ON lab_ops_purchase_order_lines FOR ALL USING (EXISTS (SELECT 1 FROM lab_ops_purchase_orders WHERE id = purchase_order_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));

-- Goods Receipts
CREATE POLICY "Users can view GRNs" ON lab_ops_goods_receipts FOR SELECT USING (EXISTS (SELECT 1 FROM lab_ops_purchase_orders WHERE id = purchase_order_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));
CREATE POLICY "Users can manage GRNs" ON lab_ops_goods_receipts FOR ALL USING (EXISTS (SELECT 1 FROM lab_ops_purchase_orders WHERE id = purchase_order_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));

-- GRN Lines
CREATE POLICY "Users can view GRN lines" ON lab_ops_goods_receipt_lines FOR SELECT USING (EXISTS (SELECT 1 FROM lab_ops_goods_receipts gr JOIN lab_ops_purchase_orders po ON gr.purchase_order_id = po.id WHERE gr.id = goods_receipt_id AND is_lab_ops_outlet_member(auth.uid(), po.outlet_id)));
CREATE POLICY "Users can manage GRN lines" ON lab_ops_goods_receipt_lines FOR ALL USING (EXISTS (SELECT 1 FROM lab_ops_goods_receipts gr JOIN lab_ops_purchase_orders po ON gr.purchase_order_id = po.id WHERE gr.id = goods_receipt_id AND is_lab_ops_outlet_member(auth.uid(), po.outlet_id)));

-- Stock Takes
CREATE POLICY "Users can view outlet stock takes" ON lab_ops_stock_takes FOR SELECT USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));
CREATE POLICY "Users can manage outlet stock takes" ON lab_ops_stock_takes FOR ALL USING (is_lab_ops_outlet_member(auth.uid(), outlet_id));

-- Stock Take Lines
CREATE POLICY "Users can view stock take lines" ON lab_ops_stock_take_lines FOR SELECT USING (EXISTS (SELECT 1 FROM lab_ops_stock_takes WHERE id = stock_take_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));
CREATE POLICY "Users can manage stock take lines" ON lab_ops_stock_take_lines FOR ALL USING (EXISTS (SELECT 1 FROM lab_ops_stock_takes WHERE id = stock_take_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));

-- Recipes
CREATE POLICY "Users can view recipes" ON lab_ops_recipes FOR SELECT USING (EXISTS (SELECT 1 FROM lab_ops_menu_items WHERE id = menu_item_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));
CREATE POLICY "Users can manage recipes" ON lab_ops_recipes FOR ALL USING (EXISTS (SELECT 1 FROM lab_ops_menu_items WHERE id = menu_item_id AND is_lab_ops_outlet_member(auth.uid(), outlet_id)));

-- Recipe Ingredients
CREATE POLICY "Users can view recipe ingredients" ON lab_ops_recipe_ingredients FOR SELECT USING (EXISTS (SELECT 1 FROM lab_ops_recipes r JOIN lab_ops_menu_items m ON r.menu_item_id = m.id WHERE r.id = recipe_id AND is_lab_ops_outlet_member(auth.uid(), m.outlet_id)));
CREATE POLICY "Users can manage recipe ingredients" ON lab_ops_recipe_ingredients FOR ALL USING (EXISTS (SELECT 1 FROM lab_ops_recipes r JOIN lab_ops_menu_items m ON r.menu_item_id = m.id WHERE r.id = recipe_id AND is_lab_ops_outlet_member(auth.uid(), m.outlet_id)));

-- Audit Logs
CREATE POLICY "Users can view outlet audit logs" ON lab_ops_audit_logs FOR SELECT USING (outlet_id IS NULL OR is_lab_ops_outlet_member(auth.uid(), outlet_id));
CREATE POLICY "Users can create audit logs" ON lab_ops_audit_logs FOR INSERT WITH CHECK (true);

-- Enable realtime for KDS
ALTER PUBLICATION supabase_realtime ADD TABLE lab_ops_order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE lab_ops_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE lab_ops_tables;
