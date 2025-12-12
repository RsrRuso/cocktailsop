-- Add unit column to purchase_order_items
ALTER TABLE public.purchase_order_items
ADD COLUMN IF NOT EXISTS unit TEXT;

-- Add delivery_date column to purchase_order_items
ALTER TABLE public.purchase_order_items
ADD COLUMN IF NOT EXISTS delivery_date DATE;