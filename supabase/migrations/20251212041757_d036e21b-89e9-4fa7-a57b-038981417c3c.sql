-- Add record_id column to link items directly to their upload record
ALTER TABLE public.purchase_order_received_items 
ADD COLUMN IF NOT EXISTS record_id UUID REFERENCES public.po_received_records(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_received_items_record_id ON public.purchase_order_received_items(record_id);