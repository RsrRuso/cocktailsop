-- Add cost/price fields to inventory items
ALTER TABLE public.lab_ops_inventory_items
ADD COLUMN IF NOT EXISTS unit_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sale_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT 0;

-- Add cost/price fields to stock movements for tracking per-transaction pricing
ALTER TABLE public.lab_ops_stock_movements
ADD COLUMN IF NOT EXISTS unit_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS sale_price numeric DEFAULT 0;

-- Create index for faster analytics queries
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON lab_ops_stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON lab_ops_stock_movements(inventory_item_id);