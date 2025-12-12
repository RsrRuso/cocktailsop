-- Add document_number column to purchase_order_received_items for linking to records
ALTER TABLE public.purchase_order_received_items 
ADD COLUMN IF NOT EXISTS document_number TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_po_received_items_document_number 
ON public.purchase_order_received_items(document_number);