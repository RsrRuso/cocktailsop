-- Add cost, VAT, and fees columns to lab_ops_sales for comprehensive sales analytics
ALTER TABLE public.lab_ops_sales 
ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS vat_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_charge_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_charge_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS gross_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount numeric DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.lab_ops_sales.cost_price IS 'Cost price per unit for profit calculation';
COMMENT ON COLUMN public.lab_ops_sales.vat_percentage IS 'VAT percentage applied';
COMMENT ON COLUMN public.lab_ops_sales.vat_amount IS 'Calculated VAT amount';
COMMENT ON COLUMN public.lab_ops_sales.service_charge_percentage IS 'Service charge/fee percentage';
COMMENT ON COLUMN public.lab_ops_sales.service_charge_amount IS 'Calculated service charge amount';
COMMENT ON COLUMN public.lab_ops_sales.gross_amount IS 'Total amount before deductions';
COMMENT ON COLUMN public.lab_ops_sales.net_amount IS 'Net amount after cost (profit)';