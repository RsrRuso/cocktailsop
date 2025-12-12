-- Create table for storing received record files (like Recent Orders)
CREATE TABLE public.po_received_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  supplier_name TEXT,
  document_number TEXT,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_items INTEGER DEFAULT 0,
  total_quantity NUMERIC DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'completed',
  variance_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.po_received_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own received records" 
ON public.po_received_records 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create table for tracking price changes
CREATE TABLE public.po_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  previous_price NUMERIC,
  current_price NUMERIC NOT NULL,
  change_amount NUMERIC,
  change_pct NUMERIC,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.po_price_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own price history" 
ON public.po_price_history 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger to track price changes in master items
CREATE OR REPLACE FUNCTION public.track_master_item_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.last_price IS DISTINCT FROM NEW.last_price AND NEW.last_price IS NOT NULL THEN
    INSERT INTO po_price_history (user_id, item_name, previous_price, current_price, change_amount, change_pct)
    VALUES (
      NEW.user_id,
      NEW.item_name,
      OLD.last_price,
      NEW.last_price,
      NEW.last_price - COALESCE(OLD.last_price, 0),
      CASE WHEN OLD.last_price > 0 THEN ((NEW.last_price - OLD.last_price) / OLD.last_price) * 100 ELSE 0 END
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER track_price_changes
BEFORE UPDATE ON public.purchase_order_master_items
FOR EACH ROW
EXECUTE FUNCTION public.track_master_item_price_change();

-- Add index for performance
CREATE INDEX idx_po_received_records_user_date ON public.po_received_records(user_id, received_date DESC);
CREATE INDEX idx_po_price_history_user_date ON public.po_price_history(user_id, changed_at DESC);