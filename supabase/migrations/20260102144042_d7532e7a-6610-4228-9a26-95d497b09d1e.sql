-- Add is_received column to track item follow-up status
-- Default true for existing items (already received)
-- Users can untick items that are missing/need follow-up

ALTER TABLE public.purchase_order_received_items 
ADD COLUMN IF NOT EXISTS is_received boolean NOT NULL DEFAULT true;

-- Add notes column for follow-up tracking
ALTER TABLE public.purchase_order_received_items 
ADD COLUMN IF NOT EXISTS follow_up_notes text;

-- Add updated_at column for tracking changes
ALTER TABLE public.purchase_order_received_items 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_received_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_received_items_updated_at ON public.purchase_order_received_items;

CREATE TRIGGER update_received_items_updated_at
BEFORE UPDATE ON public.purchase_order_received_items
FOR EACH ROW
EXECUTE FUNCTION public.update_received_items_updated_at();