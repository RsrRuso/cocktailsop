-- Add submitter info columns to purchase_orders
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS submitted_by_name text,
ADD COLUMN IF NOT EXISTS submitted_by_email text;

-- Add receiver info columns to po_received_records
ALTER TABLE public.po_received_records 
ADD COLUMN IF NOT EXISTS received_by_name text,
ADD COLUMN IF NOT EXISTS received_by_email text;